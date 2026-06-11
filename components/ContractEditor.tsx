import React, { useState, useEffect, useRef } from 'react';
import { Tenant } from '../types';
import { X, Printer, CheckCircle2, ScrollText, Cloud, CloudOff, RefreshCw, FileUp, ExternalLink } from 'lucide-react';
import { GOOGLE_SCRIPT_CONTRACTS_URL, syncContractToSheet, fetchContractFromSheet, createContractDoc } from '../services/googleSheetService';
import { buildContractText } from './contractText';

/**
 * 住宅租賃契約書（內政部 113 年 7 月 8 日修正範本）
 * 可逐欄填寫、勾選，依租客各自儲存（localStorage），並可列印 / 另存 PDF。
 */

interface ContractEditorProps {
  tenant: Tenant;
  onClose: () => void;
  /** 指定 localStorage key 以唯讀模式檢視歷史合約（不可編輯、不自動儲存、不同步雲端） */
  archiveKey?: string;
}

// 西元 ISO 日期 → 民國年月日
const rocDate = (iso?: string): { y: string; m: string; d: string } => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return { y: '', m: '', d: '' };
  const [y, m, d] = iso.slice(0, 10).split('-');
  return { y: String(Number(y) - 1911), m: String(Number(m)), d: String(Number(d)) };
};

const PRINT_CSS = `
@media print {
  @page { margin: 16mm; }
  body * { visibility: hidden !important; }
  #contract-print-area, #contract-print-area * { visibility: visible !important; }
  #contract-modal { position: static !important; padding: 0 !important; background: none !important; }
  #contract-panel { position: static !important; box-shadow: none !important; height: auto !important; max-height: none !important; border-radius: 0 !important; }
  #contract-scroll { overflow: visible !important; height: auto !important; }
  #contract-print-area { position: absolute !important; left: 0; top: 0; width: 100%; padding: 0 !important; }
  #contract-print-area input[type="text"] { border: none !important; border-bottom: 1px solid #444 !important; border-radius: 0 !important; background: none !important; }
  #contract-print-area textarea { border: 1px solid #999 !important; background: none !important; }
  .contract-page-break { page-break-before: always; }
}
`;

const ContractEditor: React.FC<ContractEditorProps> = ({ tenant, onClose, archiveKey }) => {
  const readOnly = !!archiveKey;
  const storageKey = archiveKey || `sl_contract_form_${tenant.id}`;

  const buildDefaults = (): Record<string, any> => {
    const s = rocDate(tenant.moveInDate);
    const e = rocDate(tenant.leaseEndDate);
    const months = tenant.rentAmount > 0 ? Math.round(tenant.deposit / tenant.rentAmount) : 0;
    return {
      party_tenant: tenant.name,
      ck_owner: true,
      suite_no: tenant.roomNumber,
      ck_suite: true,
      lease_sy: s.y, lease_sm: s.m, lease_sd: s.d,
      lease_ey: e.y, lease_em: e.m, lease_ed: e.d,
      rent: tenant.rentAmount ? tenant.rentAmount.toLocaleString() : '',
      deposit_months: months ? String(months) : '',
      deposit_amt: tenant.deposit ? tenant.deposit.toLocaleString() : '',
      special: tenant.contractContent || '',
      t_name: tenant.name,
      t_id: tenant.idNumber || '',
      t_phone: tenant.phone || '',
    };
  };

  // 本機儲存格式：{ updatedAt, fields }；相容舊格式（直接存 fields 物件）
  const loadLocal = (): { updatedAt: string; fields: Record<string, any> } | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.fields) {
        return { updatedAt: parsed.updatedAt || '', fields: parsed.fields };
      }
      return { updatedAt: '', fields: parsed }; // 舊格式
    } catch { return null; }
  };

  const [fields, setFields] = useState<Record<string, any>>(() => {
    const local = loadLocal();
    return local ? local.fields : buildDefaults();
  });
  const [savedAt, setSavedAt] = useState<string>('');
  const [cloudStatus, setCloudStatus] = useState<'off' | 'idle' | 'syncing' | 'synced' | 'error'>(
    GOOGLE_SCRIPT_CONTRACTS_URL ? 'idle' : 'off'
  );
  const firstRender = useRef(true);
  const skipCloudPush = useRef(false);

  // --- 存雲端文件（建立 Google 文件到 Drive 資料夾）---
  const [docStatus, setDocStatus] = useState<'idle' | 'creating' | 'done' | 'error'>('idle');
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const handleCreateDoc = async () => {
    if (docStatus === 'creating') return;
    setDocStatus('creating');
    const content = buildContractText(fields, tenant);
    const fileName = `住宅租賃契約_${tenant.name}_${new Date().toISOString().slice(0, 10)}`;
    const url = await createContractDoc(fileName, content);
    if (url) { setDocUrl(url); setDocStatus('done'); }
    else setDocStatus('error');
  };

  // 開啟時讀取雲端版本：若雲端較新（ISO 時間字串可直接比較），以雲端為準
  useEffect(() => {
    if (readOnly) return; // 歷史合約唯讀，不碰雲端
    let cancelled = false;
    (async () => {
      const cloud = await fetchContractFromSheet(tenant.id);
      if (cancelled || !cloud || !cloud.data) return;
      const local = loadLocal();
      if (cloud.updatedAt && cloud.updatedAt > (local?.updatedAt || '')) {
        try {
          const cloudFields = JSON.parse(cloud.data);
          if (cloudFields && typeof cloudFields === 'object') {
            skipCloudPush.current = true;
            setFields(cloudFields);
            localStorage.setItem(storageKey, JSON.stringify({ updatedAt: cloud.updatedAt, fields: cloudFields }));
            setCloudStatus('synced');
          }
        } catch { /* ignore malformed cloud data */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自動儲存：本機 400ms 防抖；雲端 2 秒防抖（避免逐字打字狂打 API）
  useEffect(() => {
    if (readOnly) return; // 歷史合約唯讀，不寫入
    if (firstRender.current) { firstRender.current = false; return; }
    if (skipCloudPush.current) { skipCloudPush.current = false; return; }
    const now = new Date().toISOString();
    const localTimer = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ updatedAt: now, fields }));
        setSavedAt(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
      } catch { /* storage full */ }
    }, 400);
    const cloudTimer = setTimeout(async () => {
      if (!GOOGLE_SCRIPT_CONTRACTS_URL) return;
      setCloudStatus('syncing');
      const ok = await syncContractToSheet({
        tenantId: tenant.id,
        tenantName: tenant.name,
        updatedAt: now,
        data: JSON.stringify(fields),
      });
      setCloudStatus(ok ? 'synced' : 'error');
    }, 2000);
    return () => { clearTimeout(localTimer); clearTimeout(cloudTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, storageKey]);

  const set = (k: string, v: any) => setFields(prev => ({ ...prev, [k]: v }));

  // 注意：用函式呼叫（非元件）以避免每次 render 重新掛載導致輸入框失焦
  const inp = (k: string, w = 70, ph = '') => (
    <input
      type="text"
      value={fields[k] ?? ''}
      onChange={e => set(k, e.target.value)}
      placeholder={ph}
      readOnly={readOnly}
      style={{ width: w }}
      className="inline-block align-baseline border-b border-dashed border-stone-400 bg-transparent text-center text-accent font-bold focus:border-accent outline-none px-1 mx-0.5 text-[13px]"
    />
  );

  const ck = (k: string, label: React.ReactNode) => (
    <label className={`inline-flex items-center gap-1 mx-1 select-none align-baseline whitespace-nowrap ${readOnly ? '' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={!!fields[k]}
        onChange={e => { if (!readOnly) set(k, e.target.checked); }}
        className="rounded border-stone-400 text-accent focus:ring-accent w-3.5 h-3.5"
      />
      <span>{label}</span>
    </label>
  );

  const Art = ({ no, title, children }: { no: string; title: string; children: React.ReactNode }) => (
    <section className="mb-5">
      <h4 className="font-bold text-ink mb-1.5">第{no}條 {title}</h4>
      <div className="pl-4 space-y-1.5">{children}</div>
    </section>
  );

  return (
    <div id="contract-modal" className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6">
      <style>{PRINT_CSS}</style>
      <div id="contract-panel" className="bg-surface w-full h-full sm:rounded-cozy sm:max-w-4xl sm:h-[94vh] flex flex-col overflow-hidden shadow-warm-xl">

        {/* 工具列 */}
        <div className="px-4 sm:px-6 py-3 border-b border-line flex justify-between items-center bg-bg shrink-0 gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <ScrollText size={18} className="text-accent shrink-0" />
            <div className="min-w-0">
              <h3 className="font-serif text-sm sm:text-base font-bold text-ink truncate">
                住宅租賃契約書 · {tenant.name}{readOnly && <span className="ml-2 text-[10px] font-bold text-white bg-stone-500 px-2 py-0.5 rounded-full align-middle">歷史合約（唯讀）</span>}
              </h3>
              <p className="text-[10px] text-ink-mute">{readOnly ? '續約前封存的舊合約，僅供檢視與列印' : '內政部 113.7.8 修正範本 · 點欄位即可填寫，自動儲存'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedAt && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-leaf font-bold">
                <CheckCircle2 size={12} /> 已儲存 {savedAt}
              </span>
            )}
            {cloudStatus === 'off' && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-ink-mute font-bold" title="尚未設定合約雲端同步">
                <CloudOff size={12} /> 僅本機
              </span>
            )}
            {cloudStatus === 'syncing' && (
              <span className="flex items-center gap-1 text-[10px] text-sky-600 font-bold">
                <RefreshCw size={12} className="animate-spin" /> 同步中
              </span>
            )}
            {cloudStatus === 'synced' && (
              <span className="flex items-center gap-1 text-[10px] text-leaf font-bold">
                <Cloud size={12} /> 已同步雲端
              </span>
            )}
            {cloudStatus === 'error' && (
              <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold" title="稍後修改任一欄位會自動重試">
                <CloudOff size={12} /> 雲端同步失敗
              </span>
            )}
            {docStatus === 'done' && docUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-leaf text-white px-3 py-2 rounded-lg font-bold hover:bg-emerald-700 transition shadow-warm-sm"
                title="開啟剛建立的 Google 文件"
              >
                <ExternalLink size={14} /> 開啟文件
              </a>
            ) : (
              <button
                onClick={handleCreateDoc}
                disabled={docStatus === 'creating'}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-bold transition shadow-warm-sm ${docStatus === 'error' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-surface border border-line text-ink-soft hover:border-accent hover:text-accent'} disabled:opacity-60`}
                title="將填寫內容建立為 Google 文件，存到雲端硬碟資料夾"
              >
                {docStatus === 'creating'
                  ? (<><RefreshCw size={14} className="animate-spin" /> 建立中</>)
                  : docStatus === 'error'
                  ? (<><FileUp size={14} /> 失敗，重試</>)
                  : (<><FileUp size={14} /> 存雲端文件</>)}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-ink text-white px-3 py-2 rounded-lg font-bold hover:bg-black transition shadow-warm-sm"
            >
              <Printer size={14} /> 列印 / 存 PDF
            </button>
            <button onClick={onClose} className="p-2 text-ink-mute hover:text-ink rounded-full hover:bg-surface-warm transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 契約內文 */}
        <div id="contract-scroll" className="flex-1 overflow-y-auto">
          <div id="contract-print-area" className="p-5 sm:p-10 text-[13px] leading-7 text-ink max-w-3xl mx-auto">

            <h1 className="text-center text-xl font-black mb-1">住宅租賃契約書</h1>
            <p className="text-center text-[10px] text-ink-mute mb-6 leading-4">
              中華民國91年1月30日內政部台內中地字第0910083141號公告頒行<br />
              中華民國105年6月23日內政部內授中辦地字第1051305386號公告修正<br />
              中華民國109年8月26日內政部台內地字第1090264511號函修正<br />
              中華民國113年7月8日內政部台內地字第11302639334號函修正
            </p>

            {/* 契約審閱權 */}
            <section className="mb-6 border border-line rounded-lg p-4 bg-bg/50">
              <h4 className="font-bold mb-1.5">契約審閱權</h4>
              <p>
                住宅租賃契約（以下簡稱本契約）於民國{inp('rev_y', 48)}年{inp('rev_m', 36)}月{inp('rev_d', 36)}日經承租人攜回審閱{inp('rev_days', 36)}日（契約審閱期間至少三日）。
              </p>
              <p className="mt-2">出租人簽章：{inp('rev_landlord_sign', 140)}</p>
              <p>承租人簽章：{inp('rev_tenant_sign', 140)}</p>
            </section>

            <p className="mb-5">
              立契約書人承租人{inp('party_tenant', 90)}，出租人{inp('party_landlord', 90)}
              【為{ck('ck_owner', '所有權人')}{ck('ck_subleaser', '轉租人(應提示經原所有權人同意轉租之證明文件)')}】茲為住宅租賃事宜，雙方同意本契約條款如下：
            </p>

            <Art no="一" title="租賃標的">
              <p className="font-bold">(一)租賃住宅標示：</p>
              <p className="pl-4">
                1、門牌{inp('addr_county', 56)}縣(市){inp('addr_town', 56)}鄉（鎮、市、區）{inp('addr_street', 70)}街(路){inp('addr_sec', 32)}段{inp('addr_lane', 32)}巷{inp('addr_alley', 32)}弄{inp('addr_no', 32)}號{inp('addr_floor', 32)}樓之{inp('addr_of', 32)}
                （基地坐落{inp('addr_land_sec', 48)}段{inp('addr_land_small', 48)}小段{inp('addr_land_no', 48)}地號）。
                無門牌者，其房屋稅籍編號：{inp('tax_id', 110)}或其位置略圖。
              </p>
              <p className="pl-4">
                2、專有部分建號{inp('bld_no', 60)}，權利範圍{inp('bld_scope', 60)}，面積共計{inp('bld_area', 56)}平方公尺。
              </p>
              <p className="pl-8">
                (1)主建物面積：{inp('main_desc', 220, '__層__平方公尺…')}共計{inp('main_total', 56)}平方公尺，用途{inp('main_use', 70)}。
              </p>
              <p className="pl-8">
                (2)附屬建物用途{inp('attach_use', 70)}，面積{inp('attach_area', 56)}平方公尺。
              </p>
              <p className="pl-4">
                3、共有部分建號{inp('common_no', 60)}，權利範圍{inp('common_scope', 60)}，持分面積{inp('common_area', 56)}平方公尺。
              </p>
              <p className="pl-4">
                4、車位：{ck('ck_car_have', <>有（汽車停車位{inp('car_count', 32)}個、機車停車位{inp('moto_count', 32)}個）</>)}{ck('ck_car_none', '無')}。
              </p>
              <p className="pl-4">
                5、{ck('ck_rights_have', '有')}{ck('ck_rights_none', '無')}設定他項權利，若有，權利種類：{inp('rights_type', 110)}。
              </p>
              <p className="pl-4">
                6、{ck('ck_seizure_have', '有')}{ck('ck_seizure_none', '無')}查封登記。
              </p>
              <p className="font-bold mt-2">(二)租賃範圍：</p>
              <p className="pl-4">
                1、租賃住宅{ck('ck_scope_all', '全部')}{ck('ck_scope_part', '部分')}：第{inp('scope_floor', 36)}層
                {ck('ck_room', <>房間{inp('room_count', 32)}間</>)}{ck('ck_suite', <>第{inp('suite_no', 44)}室</>)}，
                面積{inp('scope_area', 56)}平方公尺(如「租賃住宅位置格局示意圖」標註之租賃範圍)。
              </p>
              <p className="pl-4">2、車位(如無則免填)：</p>
              <p className="pl-8">
                (1)汽車停車位種類及編號：地上(下)第{inp('car_floor', 36)}層{ck('ck_car_flat', '平面式停車位')}{ck('ck_car_mech', '機械式停車位')}，編號第{inp('car_no', 40)}號。
              </p>
              <p className="pl-8">
                (2)機車停車位：地上(下)第{inp('moto_floor', 36)}層編號第{inp('moto_no', 40)}號或其位置示意圖。
              </p>
              <p className="pl-8">
                (3)使用時間：{ck('ck_use_all', '全日')}{ck('ck_use_day', '日間')}{ck('ck_use_night', '夜間')}{ck('ck_use_other', '其他')}{inp('use_other', 80)}。
              </p>
              <p className="pl-4">
                3、租賃附屬設備：{ck('ck_equip_have', '有')}{ck('ck_equip_none', '無')}附屬設備，若有，詳如附件一租賃標的現況確認書。
              </p>
            </Art>

            <Art no="二" title="租賃期間">
              <p>
                租賃期間自民國{inp('lease_sy', 48)}年{inp('lease_sm', 36)}月{inp('lease_sd', 36)}日起至民國{inp('lease_ey', 48)}年{inp('lease_em', 36)}月{inp('lease_ed', 36)}日止。(租賃期間至少三十日以上)
              </p>
            </Art>

            <Art no="三" title="租金約定及支付">
              <p>
                承租人每月租金為新臺幣(下同){inp('rent', 90)}元整，每期應繳納{inp('pay_per_months', 36)}個月租金，
                並於{ck('ck_pay_month', <>每月{inp('pay_day', 32)}日</>)}{ck('ck_pay_period', <>每期{inp('pay_period_day', 32)}日</>)}前支付，
                不得藉任何理由拖延或拒絕；出租人於租賃期間亦不得藉任何理由要求調漲租金。
              </p>
              <p>
                租金支付方式：{ck('ck_pay_cash', '現金繳付')}{ck('ck_pay_transfer', '轉帳繳付')}：
                金融機構：{inp('bank', 100)}，戶名：{inp('acct_name', 90)}，帳號：{inp('acct_no', 130)}。
                {ck('ck_pay_other', '其他')}：{inp('pay_other_txt', 100)}。
              </p>
            </Art>

            <Art no="四" title="押金約定及返還">
              <p>
                押金由租賃雙方約定為{inp('deposit_months', 36)}個月租金，金額為{inp('deposit_amt', 90)}元整(最高不得超過二個月租金之總額)。承租人應於簽訂本契約之同時給付出租人。
              </p>
              <p>
                前項押金，除有第十一條第四項、第十三條第三項、第十四條第四項及第十八條第二項得抵充之情形外，出租人應於租期屆滿或租賃契約終止，承租人返還租賃住宅時，返還押金或抵充本契約所生債務後之賸餘押金。
              </p>
            </Art>

            <Art no="五" title="租賃期間相關費用之約定">
              <p>租賃期間，使用租賃住宅所生之相關費用，依下列約定辦理：</p>
              <p className="font-bold">(一)管理費：</p>
              <p className="pl-4">
                {ck('ck_mgmt_landlord', '由出租人負擔')}。{ck('ck_mgmt_tenant', '由承租人負擔')}。<br />
                租賃住宅每月{inp('mgmt_fee_house', 56)}元整。停車位每月{inp('mgmt_fee_car', 56)}元整。<br />
                租賃期間因不可歸責於租賃雙方之事由，致本費用增加者，承租人就增加部分之金額，以負擔百分之十為限；如本費用減少者，承租人負擔減少後之金額。<br />
                {ck('ck_mgmt_other', '其他')}：{inp('mgmt_other_txt', 160)}。
              </p>
              <p className="font-bold">(二)水費：</p>
              <p className="pl-4">
                {ck('ck_water_landlord', '由出租人負擔')}。{ck('ck_water_tenant', '由承租人負擔')}。{ck('ck_water_other', '其他')}：{inp('water_other_txt', 140)}。
              </p>
              <p className="font-bold">(三)電費：</p>
              <p className="pl-4">
                {ck('ck_elec_landlord', '由出租人負擔')}。{ck('ck_elec_tenant', '由承租人負擔')}。<br />
                {ck('ck_elec_by_degree', '以用電度數計費')}：<br />
                <span className="pl-4 block">
                  {ck('ck_elec_avg', '每期依電費單之「當期每度平均電價」計收')}。<br />
                  {ck('ck_elec_fixed', <>每期每度{inp('elec_price', 40)}元。但每度電費如有超過電費單之「當期每度平均電價」，應於結算時退還溢收電費</>)}。<br />
                  <span className="text-[11px] text-ink-soft">（備註：公共設施電費未向台灣電力股份有限公司申辦分攤併入租賃標的電費內者，出租人不得額外收取。）</span>
                </span>
                {ck('ck_elec_nondegree', '非以用電度數計費')}：約定計費方式{inp('elec_calc', 160)}。<br />
                <span className="text-[11px] text-ink-soft pl-4 block">（備註：出租人所收取之每期電費總金額，不得超過該租賃標的電費單之每期電費總額。）</span>
              </p>
              <p className="font-bold">(四)瓦斯費：</p>
              <p className="pl-4">
                {ck('ck_gas_landlord', '由出租人負擔')}。{ck('ck_gas_tenant', '由承租人負擔')}。{ck('ck_gas_other', '其他')}：{inp('gas_other_txt', 140)}。
              </p>
              <p className="font-bold">(五)網路費：</p>
              <p className="pl-4">
                {ck('ck_net_landlord', '由出租人負擔')}。{ck('ck_net_tenant', '由承租人負擔')}。{ck('ck_net_other', '其他')}：{inp('net_other_txt', 140)}。
              </p>
              <p className="font-bold">(六)其他費用及其支付方式：</p>
              <p className="pl-4">{inp('other_fee', 300)}。</p>
            </Art>

            <Art no="六" title="稅費負擔之約定">
              <p>本契約有關稅費，依下列約定辦理：</p>
              <p>(一)租賃住宅之房屋稅、地價稅由出租人負擔。</p>
              <p>
                (二)本契約租賃雙方同意辦理公證者，其公證費{inp('notary_fee', 70)}元整。<br />
                <span className="pl-4">{ck('ck_notary_landlord', '由出租人負擔')}。{ck('ck_notary_tenant', '由承租人負擔')}。{ck('ck_notary_half', '由租賃雙方平均負擔')}。{ck('ck_notary_other', '其他')}：{inp('notary_other_txt', 110)}。</span>
              </p>
              <p>(三)其他稅費及其支付方式：{inp('other_tax', 220)}。</p>
            </Art>

            <Art no="七" title="使用租賃住宅之限制">
              <p>本租賃住宅係供居住使用，承租人不得變更用途。</p>
              <p>承租人同意遵守公寓大廈規約或其他住戶應遵行事項，不得違法使用、存放有爆炸性或易燃性物品。</p>
              <p>承租人應經出租人同意始得將本租賃住宅之全部或一部分轉租、出借或以其他方式供他人使用，或將租賃權轉讓於他人。</p>
              <p>前項出租人同意轉租者，應出具同意書(如附件二)載明同意轉租之範圍、期間及得終止本契約之事由，供承租人轉租時向次承租人提示。</p>
            </Art>

            <Art no="八" title="修繕">
              <p>租賃住宅或附屬設備損壞時，應由出租人負責修繕。但租賃雙方另有約定、習慣或其損壞係可歸責於承租人之事由者，不在此限。</p>
              <p>前項由出租人負責修繕者，承租人得定相當期限催告修繕，如出租人未於承租人所定相當期限內修繕時，承租人得自行修繕，並請求出租人償還其費用或於第三條約定之租金中扣除。</p>
              <p>出租人為修繕租賃住宅所為之必要行為，應於相當期間先期通知，承租人無正當理由不得拒絕。</p>
              <p>前項出租人於修繕期間，致租賃住宅全部或一部不能居住使用者，承租人得請求出租人扣除該期間全部或一部之租金。</p>
            </Art>

            <Art no="九" title="室內裝修">
              <p>承租人有室內裝修之需要，應經出租人同意並依相關法令規定辦理，且不得損害原有建築結構之安全。</p>
              <p>承租人經出租人同意裝修者，其裝修增設部分若有損壞，由承租人負責修繕。</p>
              <p>
                第一項情形，承租人返還租賃住宅時，應{ck('ck_restore_orig', '負責回復原狀')}{ck('ck_restore_asis', '現況返還')}{ck('ck_restore_other', '其他')}{inp('restore_other_txt', 110)}。
              </p>
            </Art>

            <Art no="十" title="出租人之義務及責任">
              <p>出租人應出示有權出租本租賃住宅之證明文件及國民身分證或其他足資證明身分之文件，供承租人核對。</p>
              <p>出租人應以合於所約定居住使用之租賃住宅，交付承租人，並應於租賃期間保持其合於居住使用之狀態。</p>
              <p>出租人與承租人簽訂本契約前，租賃住宅有由承租人負責修繕之項目及範圍者，出租人應先向承租人說明並經承租人確認（如附件三），未經約明確認者，出租人應負責修繕，並提供有修繕必要時之聯絡方式。</p>
              <p>依第五條規定約定電費由承租人負擔者，出租人應提供承租人租賃標的之電費資訊。承租人亦得逕向台灣電力股份有限公司申辦查詢租賃期間之有關電費資訊。</p>
            </Art>

            <Art no="十一" title="承租人之義務及責任">
              <p>承租人應於簽訂本契約時，出示國民身分證或其他足資證明身分之文件，供出租人核對。</p>
              <p>承租人應以善良管理人之注意，保管、使用租賃住宅。</p>
              <p>承租人違反前項義務，致租賃住宅毀損或滅失者，應負損害賠償責任。但依約定之方法或依租賃住宅之性質使用、收益，致有變更或毀損者，不在此限。</p>
              <p>前項承租人應賠償之金額，得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之金額。</p>
              <p>承租人經出租人同意轉租者，與次承租人簽訂轉租契約時，應不得逾出租人同意轉租之範圍及期間，並應於簽訂轉租契約後三十日內，以書面將轉租範圍、期間、次承租人之姓名及通訊住址等相關資料通知出租人。</p>
            </Art>

            <Art no="十二" title="租賃住宅部分滅失">
              <p>租賃關係存續中，因不可歸責於承租人之事由，致租賃住宅之一部滅失者，承租人得按滅失之部分，請求減少租金。</p>
            </Art>

            <Art no="十三" title="任意終止租約之約定">
              <p>
                本契約於期限屆滿前，除依第十六條及第十七條規定得提前終止租約外，租賃雙方{ck('ck_term_allow', '得')}{ck('ck_term_disallow', '不得')}任意終止租約。
              </p>
              <p>依前項約定得終止租約者，租賃之一方應至少於終止前一個月通知他方。一方未為先期通知而逕行終止租約者，應賠償他方最高不得超過一個月租金額之違約金。</p>
              <p>前項承租人應賠償之違約金，得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之金額。</p>
              <p>租期屆滿前，依第一項終止租約者，出租人已預收之租金應返還予承租人。</p>
            </Art>

            <Art no="十四" title="租賃住宅之返還">
              <p>租賃關係消滅時，出租人應即結算租金及第五條約定之相關費用，並會同承租人共同完成屋況及附屬設備之點交手續，承租人應將租賃住宅返還出租人並遷出戶籍或其他登記。</p>
              <p>前項租賃之一方未會同點交，經他方定相當期限催告仍不會同者，視為完成點交。</p>
              <p>承租人未依第一項規定返還租賃住宅時，出租人應即明示不以不定期限繼續契約，並得向承租人請求未返還租賃住宅期間之相當月租金額，及相當月租金額計算之違約金(未足一個月者，以日租金折算)至返還為止。</p>
              <p>前項金額與承租人未繳清之租金及第五條約定之相關費用，出租人得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之金額或費用。</p>
            </Art>

            <Art no="十五" title="租賃住宅所有權之讓與">
              <p>出租人於租賃住宅交付後，承租人占有中，縱將其所有權讓與第三人，本契約對於受讓人仍繼續存在。</p>
              <p>前項情形，出租人應移交押金及已預收之租金與受讓人，並以書面通知承租人。</p>
              <p>本契約如未經公證，其期限逾五年者，不適用前二項之規定。</p>
            </Art>

            <Art no="十六" title="出租人提前終止租約">
              <p>租賃期間有下列情形之一者，出租人得提前終止租約，且承租人不得要求任何賠償：</p>
              <p>(一)出租人為重新建築而必要收回。</p>
              <p>(二)承租人遲付租金之總額達二個月之租金額，經出租人定相當期限催告，仍不為支付。</p>
              <p>(三)承租人積欠管理費或其他應負擔之費用達二個月之租金額，經出租人定相當期限催告，仍不為支付。</p>
              <p>(四)承租人違反第七條第一項規定，擅自變更用途，經出租人阻止仍繼續為之。</p>
              <p>(五)承租人違反第七條第二項規定，違法使用、存放有爆炸性或易燃性物品，經出租人阻止仍繼續為之。</p>
              <p>(六)承租人違反第七條第三項規定，擅自將租賃住宅轉租或轉讓租賃權予他人。</p>
              <p>(七)承租人毀損租賃住宅或附屬設備，經出租人定相當期限催告修繕仍不為修繕或相當之賠償。</p>
              <p>(八)承租人違反第九條第一項規定，未經出租人同意，擅自進行室內裝修，經出租人阻止仍繼續為之。</p>
              <p>(九)承租人違反第九條第一項規定，未依相關法令規定進行室內裝修，經出租人阻止仍繼續為之。</p>
              <p>(十)承租人違反第九條第一項規定，進行室內裝修，損害原有建築結構之安全。</p>
              <p>出租人依前項規定提前終止租約者，應依下列規定期限，檢附相關事證，以書面通知承租人。但依前項第五款及第十款規定終止者，得不先期通知：</p>
              <p>(一)依前項第一款規定終止者，於終止前三個月。</p>
              <p>(二)依前項第二款至第四款、第六款至第九款規定終止者，於終止前三十日。</p>
            </Art>

            <Art no="十七" title="承租人提前終止租約">
              <p>租賃期間有下列情形之一，承租人得提前終止租約，出租人不得要求任何賠償：</p>
              <p>(一)租賃住宅未合於所約定居住使用，並有修繕之必要，經承租人定相當期限催告，仍不於期限內修繕。</p>
              <p>(二)租賃住宅因不可歸責承租人之事由致一部滅失，且其存餘部分不能達租賃之目的。</p>
              <p>(三)租賃住宅有危及承租人或其同居人之安全或健康之瑕疵；承租人於簽約時已明知該瑕疵或拋棄終止租約權利者，亦同。</p>
              <p>(四)承租人因疾病、意外產生有長期療養之需要。</p>
              <p>(五)因第三人就租賃住宅主張其權利，致承租人不能為約定之居住使用。</p>
              <p>承租人依前項各款規定提前終止租約者，應於終止前三十日，檢附相關事證，以書面通知出租人。但前項第三款前段其情況危急者，得不先期通知。</p>
              <p>承租人死亡，其繼承人得主張終止租約，其通知期限及方式，準用前項規定。</p>
            </Art>

            <Art no="十八" title="遺留物之處理">
              <p>租賃關係消滅，依第十四條完成點交或視為完成點交之手續後，承租人仍於租賃住宅有遺留物者，除租賃雙方另有約定外，經出租人定相當期限向承租人催告，屆期仍不取回時，視為拋棄其所有權。</p>
              <p>出租人處理前項遺留物所生費用，得由第四條第一項規定之押金中抵充，如有不足，並得向承租人請求給付不足之費用。</p>
            </Art>

            <Art no="十九" title="履行本契約之通知">
              <p>除本契約另有約定外，租賃雙方相互間之通知，以郵寄為之者，應以本契約所記載之地址為準。</p>
              <p>如因地址變更未告知他方，致通知無法到達時，以第一次郵遞之日期推定為到達日。</p>
              <p>
                第一項之通知得經租賃雙方約定以{ck('ck_notice_email', <>電子郵件信箱：{inp('notice_email', 150)}</>)}{ck('ck_notice_sms', '手機簡訊')}{ck('ck_notice_im', '即時通訊軟體')}以文字顯示方式為之。
              </p>
            </Art>

            <Art no="二十" title="條款疑義處理">
              <p>本契約各條款如有疑義時，應為有利於承租人之解釋。</p>
            </Art>

            <Art no="二十一" title="其他約定">
              <p>本契約租賃雙方{ck('ck_notarize_yes', '同意')}{ck('ck_notarize_no', '不同意')}辦理公證。</p>
              <p>本契約經辦理公證者，租賃雙方{ck('ck_enforce_no', '不同意')}；{ck('ck_enforce_yes', '同意')}公證書載明下列事項應逕受強制執行：</p>
              <p className="pl-4">{ck('ck_enf1', '一、承租人如於租期屆滿後不返還租賃住宅。')}</p>
              <p className="pl-4">{ck('ck_enf2', '二、承租人未依約給付之欠繳租金、費用及出租人或租賃住宅所有權人代繳之管理費，或違約時應支付之金額。')}</p>
              <p className="pl-4">{ck('ck_enf3', '三、出租人如於租期屆滿或本契約終止時，應返還承租人之全部或一部押金。')}</p>
              <p>公證書載明金錢債務逕受強制執行時，如有保證人者，前項後段第{inp('guarantor_clause', 40)}款之效力及於保證人。</p>
            </Art>

            <Art no="二十二" title="契約及其相關附件效力">
              <p>本契約自簽約日起生效，租賃雙方各執一份契約正本。</p>
              <p>本契約廣告及相關附件視為本契約之一部分。</p>
            </Art>

            <Art no="二十三" title="未盡事宜之處置">
              <p>本契約如有未盡事宜，依有關法令、習慣、平等互惠及誠實信用原則公平解決之。</p>
            </Art>

            {/* 特別約定（自行增列） */}
            <section className="mb-6 border border-accent-soft rounded-lg p-4 bg-accent-soft/20">
              <h4 className="font-bold text-ink mb-2">特別約定事項（租賃雙方自行增列）</h4>
              <textarea
                value={fields['special'] ?? ''}
                onChange={e => set('special', e.target.value)}
                rows={3}
                readOnly={readOnly}
                placeholder="例如：不可養寵物、不可開伙…（無則免填）"
                className="w-full border border-line rounded-lg p-2.5 text-[13px] bg-surface focus:ring-2 focus:ring-accent/20 outline-none resize-y"
              />
            </section>

            {/* 附件勾選 */}
            <section className="mb-6">
              <h4 className="font-bold text-ink mb-2">附件</h4>
              <div className="pl-2 grid grid-cols-1 gap-0.5">
                {ck('att_deed', '建物所有權狀影本或其他有權出租之證明文件')}
                {ck('att_license', '使用執照影本')}
                {ck('att_ids', '雙方身分證明文件影本')}
                {ck('att_guarantor_id', '保證人身分證影本')}
                {ck('att_authorization', '授權代理人簽約同意書')}
                {ck('att_condition', '租賃標的現況確認書')}
                {ck('att_sublease', '出租人同意轉租範圍、租賃期間及終止租約事由確認書')}
                {ck('att_repair', '承租人負責修繕項目及範圍確認書')}
                {ck('att_equipment', '附屬設備清單')}
                {ck('att_layout', '租賃住宅位置格局示意圖')}
                {ck('att_other', <>其他（測量成果圖、室內空間現狀照片、稅籍證明等）{inp('att_other_txt', 120)}</>)}
              </div>
            </section>

            {/* 立契約書人 */}
            <section className="contract-page-break mb-6">
              <h4 className="font-bold text-ink mb-3 text-base">立契約書人</h4>

              <div className="border border-line rounded-lg p-4 mb-4">
                <p className="font-bold mb-2">出租人：</p>
                <p>姓名(名稱)：{inp('l_name', 130)}　　　簽章：{inp('l_sign', 100)}</p>
                <p>統一編號(身分證明文件編號)：{inp('l_id', 150)}</p>
                <p>戶籍地址(營業登記地址)：{inp('l_reg_addr', 280)}</p>
                <p>通訊地址：{inp('l_mail_addr', 280)}</p>
                <p>聯絡電話：{inp('l_phone', 150)}</p>
              </div>

              <div className="border border-line rounded-lg p-4 mb-4">
                <p className="font-bold mb-2">承租人：</p>
                <p>姓名(名稱)：{inp('t_name', 130)}　　　簽章：{inp('t_sign', 100)}</p>
                <p>統一編號(身分證明文件編號)：{inp('t_id', 150)}</p>
                <p>戶籍地址(營業登記地址)：{inp('t_reg_addr', 280)}</p>
                <p>通訊地址：{inp('t_mail_addr', 280)}</p>
                <p>聯絡電話：{inp('t_phone', 150)}</p>
              </div>

              <div className="border border-line rounded-lg p-4 mb-4">
                <p className="font-bold mb-2">保證人（無則免填）：</p>
                <p>姓名(名稱)：{inp('g_name', 130)}　　　簽章：{inp('g_sign', 100)}</p>
                <p>統一編號(身分證明文件編號)：{inp('g_id', 150)}</p>
                <p>戶籍地址：{inp('g_reg_addr', 280)}</p>
                <p>通訊地址：{inp('g_mail_addr', 280)}</p>
                <p>聯絡電話：{inp('g_phone', 150)}</p>
              </div>

              <div className="border border-line rounded-lg p-4 mb-4">
                <p className="font-bold mb-2">不動產經紀業（未透過仲介則免填）：</p>
                <p>名稱（公司或商號）：{inp('agency_name', 180)}</p>
                <p>地址：{inp('agency_addr', 280)}　電話：{inp('agency_phone', 130)}</p>
                <p>統一編號：{inp('agency_uid', 130)}　負責人：{inp('agency_owner', 100)}　簽章：{inp('agency_sign', 90)}</p>
                <p>電子郵件信箱：{inp('agency_email', 200)}</p>
              </div>

              <div className="border border-line rounded-lg p-4 mb-4">
                <p className="font-bold mb-2">不動產經紀人（未透過仲介則免填）：</p>
                <p>姓名：{inp('broker_name', 130)}　簽章：{inp('broker_sign', 100)}</p>
                <p>統一編號(身分證明文件編號)：{inp('broker_id', 150)}</p>
                <p>通訊地址：{inp('broker_addr', 280)}</p>
                <p>聯絡電話：{inp('broker_phone', 130)}　證書字號：{inp('broker_cert', 130)}</p>
                <p>電子郵件信箱：{inp('broker_email', 200)}</p>
              </div>

              <p className="text-center text-base mt-6">
                中　華　民　國{inp('sign_y', 56)}年{inp('sign_m', 40)}月{inp('sign_d', 40)}日
              </p>
            </section>

            {/* 附件一：租賃標的現況確認書 */}
            <section className="contract-page-break mb-6">
              <h4 className="font-bold text-ink mb-1 text-base text-center">附件一　租賃標的現況確認書</h4>
              <p className="mb-3">填表日期：民國{inp('cf_y', 48)}年{inp('cf_m', 36)}月{inp('cf_d', 36)}日</p>

              <div className="space-y-4">
                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">1、未登記之改建、增建、加建、違建部分：</p>
                  <p>{ck('cf1_have', '有')}{ck('cf1_none', '無')}包括未登記之改建、增建、加建、違建部分：</p>
                  <p className="pl-4">
                    {ck('cf1_f1', <>壹樓{inp('cf1_f1_area', 48)}平方公尺</>)}
                    {ck('cf1_fx', <>{inp('cf1_fx_floor', 32)}樓{inp('cf1_fx_area', 48)}平方公尺</>)}
                    {ck('cf1_roof', <>頂樓{inp('cf1_roof_area', 48)}平方公尺</>)}
                    {ck('cf1_other', <>其他處所：{inp('cf1_other_txt', 90)}平方公尺</>)}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-1">若為違建（未依法申請增、加建之建物），出租人應確實加以說明，使承租人得以充分認知此範圍之建物隨時有被拆除之虞或其他危險。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">2、建物型態與格局：</p>
                  <p>建物型態：{inp('cf2_type', 160)}。</p>
                  <p>建物現況格局：{inp('cf2_rooms', 36)}房(間、室){inp('cf2_living', 36)}廳{inp('cf2_bath', 36)}衛 {ck('cf2_partition_have', '有')}{ck('cf2_partition_none', '無')}隔間。</p>
                  <p>建物出租型態：{inp('cf2_rent_type', 180, '整棟/分層/獨立套房/分租套房/分租雅房')}。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">3、停車位：</p>
                  <p>汽車停車位種類及編號：地上(下)第{inp('cf3_floor', 36)}層{ck('cf3_flat', '平面式')}{ck('cf3_mech', '機械式')}{ck('cf3_other', '其他')}{inp('cf3_other_txt', 70)}。</p>
                  <p>編號：第{inp('cf3_no', 40)}號停車位{inp('cf3_count', 32)}個，{ck('cf3_deed_have', '有')}{ck('cf3_deed_none', '無')}獨立權狀。</p>
                  <p>{ck('cf3_agreement_have', '有')}{ck('cf3_agreement_none', '無')}檢附分管協議及圖說。</p>
                  <p>機車停車位：地上(下)第{inp('cf3_moto_floor', 36)}層，編號第{inp('cf3_moto_no', 40)}號車位{inp('cf3_moto_count', 32)}個或其位置示意圖。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">4、消防設施：</p>
                  <p>{ck('cf4_alarm_have', '有')}{ck('cf4_alarm_none', '無')}住宅用火災警報器。</p>
                  <p>{ck('cf4_fire_have', '有')}{ck('cf4_fire_none', '無')}其他消防設施，若有，項目：(1){inp('cf4_item1', 70)}(2){inp('cf4_item2', 70)}(3){inp('cf4_item3', 70)}。</p>
                  <p>{ck('cf4_check_have', '有')}{ck('cf4_check_none', '無')}定期辦理消防安全檢查。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">5、滲漏水：</p>
                  <p>{ck('cf5_have', '有')}{ck('cf5_none', '無')}滲漏水之情形，若有，滲漏水處：{inp('cf5_where', 140)}。</p>
                  <p>滲漏水處之處理：{ck('cf5_fix_landlord', '由出租人修繕後交屋')}{ck('cf5_fix_tenant', '由承租人修繕')}{ck('cf5_asis', '以現況交屋')}{ck('cf5_other', '其他')}{inp('cf5_other_txt', 90)}。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">6、輻射屋檢測：</p>
                  <p>{ck('cf6_have', '有')}{ck('cf6_none', '無')}曾經做過輻射屋檢測？若有，請檢附檢測證明文件。</p>
                  <p>檢測結果{ck('cf6_abnormal', '有')}{ck('cf6_normal', '無')}輻射異常，若有異常之處理：{ck('cf6_fix_landlord', '由出租人改善後交屋')}{ck('cf6_fix_tenant', '由承租人改善')}{ck('cf6_asis', '以現況交屋')}{ck('cf6_other', '其他')}{inp('cf6_other_txt', 90)}。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">7、海砂屋檢測（鋼筋混凝土中水溶性氯離子含量）：</p>
                  <p>{ck('cf7_have', '有')}{ck('cf7_none', '無')}曾經做過檢測；若有，檢測結果：{inp('cf7_result', 140)}。</p>
                  <p>{ck('cf7_over', '有')}{ck('cf7_under', '無')}超過容許值含量，若有超過之處理：{ck('cf7_fix_landlord', '由出租人修繕後交屋')}{ck('cf7_fix_tenant', '由承租人修繕')}{ck('cf7_asis', '以現況交屋')}{ck('cf7_other', '其他')}{inp('cf7_other_txt', 90)}。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">8、非自然死亡情事（兇殺、自殺、一氧化碳中毒等）：</p>
                  <p>(1)於產權持有期間{ck('cf8_own_have', '有')}{ck('cf8_own_none', '無')}曾發生上列情事。</p>
                  <p>(2)於產權持有前：{ck('cf8_pre_none', '無上列情事')}{ck('cf8_pre_know', '知道曾發生上列情事')}{ck('cf8_pre_unknown', '不知道曾否發生上列情事')}。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">9、供水及排水：</p>
                  <p>供水及排水{ck('cf9_normal', '是')}{ck('cf9_abnormal', '否')}正常，若不正常：{ck('cf9_fix_landlord', '由出租人修繕後交屋')}{ck('cf9_fix_tenant', '由承租人修繕')}{ck('cf9_asis', '以現況交屋')}{ck('cf9_other', '其他')}{inp('cf9_other_txt', 90)}。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">10、公寓大廈規約：</p>
                  <p>{ck('cf10_have', '有')}{ck('cf10_none', '無')}公寓大廈規約或其他住戶應遵行事項；若有，{ck('cf10_attach_have', '有')}{ck('cf10_attach_none', '無')}檢附規約或其他住戶應遵行事項。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">11、管理委員會與管理費：</p>
                  <p>{ck('cf11_have', '有')}{ck('cf11_none', '無')}管理委員會統一管理。</p>
                  <p>若有，租賃住宅管理費為{ck('cf11_month', <>月繳新臺幣{inp('cf11_month_amt', 56)}元</>)}{ck('cf11_season', <>季繳新臺幣{inp('cf11_season_amt', 56)}元</>)}{ck('cf11_year', <>年繳新臺幣{inp('cf11_year_amt', 56)}元</>)}{ck('cf11_other', <>其他{inp('cf11_other_txt', 70)}</>)}。</p>
                  <p>停車位管理費為{ck('cf11_car_month', <>月繳新臺幣{inp('cf11_car_month_amt', 56)}元</>)}{ck('cf11_car_season', <>季繳{inp('cf11_car_season_amt', 56)}元</>)}{ck('cf11_car_year', <>年繳{inp('cf11_car_year_amt', 56)}元</>)}{ck('cf11_car_other', <>其他{inp('cf11_car_other_txt', 70)}</>)}。</p>
                  <p>{ck('cf11_owe_have', '有')}{ck('cf11_owe_none', '無')}積欠租賃住宅、停車位管理費；若有，新臺幣{inp('cf11_owe_amt', 70)}元。</p>
                </div>

                <div className="border border-line rounded-lg p-3">
                  <p className="font-bold mb-1">12、附屬設備項目：</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 text-[12px]">
                    {ck('eq_tv', <>電視{inp('eq_tv_n', 26)}臺</>)}
                    {ck('eq_tvcab', <>電視櫃{inp('eq_tvcab_n', 26)}件</>)}
                    {ck('eq_sofa', <>沙發{inp('eq_sofa_n', 26)}組</>)}
                    {ck('eq_tea', <>茶几{inp('eq_tea_n', 26)}件</>)}
                    {ck('eq_dining', <>餐桌(椅){inp('eq_dining_n', 26)}組</>)}
                    {ck('eq_shoe', <>鞋櫃{inp('eq_shoe_n', 26)}件</>)}
                    {ck('eq_curtain', <>窗簾{inp('eq_curtain_n', 26)}組</>)}
                    {ck('eq_light', <>燈飾{inp('eq_light_n', 26)}件</>)}
                    {ck('eq_fridge', <>冰箱{inp('eq_fridge_n', 26)}臺</>)}
                    {ck('eq_washer', <>洗衣機{inp('eq_washer_n', 26)}臺</>)}
                    {ck('eq_bookcase', <>書櫃{inp('eq_bookcase_n', 26)}件</>)}
                    {ck('eq_bed', <>床組(頭){inp('eq_bed_n', 26)}件</>)}
                    {ck('eq_wardrobe', <>衣櫃{inp('eq_wardrobe_n', 26)}組</>)}
                    {ck('eq_dresser', <>梳妝台{inp('eq_dresser_n', 26)}件</>)}
                    {ck('eq_desk', <>書桌椅{inp('eq_desk_n', 26)}組</>)}
                    {ck('eq_cabinet', <>置物櫃{inp('eq_cabinet_n', 26)}件</>)}
                    {ck('eq_phone', <>電話{inp('eq_phone_n', 26)}具</>)}
                    {ck('eq_security', <>保全設施{inp('eq_security_n', 26)}組</>)}
                    {ck('eq_microwave', <>微波爐{inp('eq_microwave_n', 26)}臺</>)}
                    {ck('eq_dishwasher', <>洗碗機{inp('eq_dishwasher_n', 26)}臺</>)}
                    {ck('eq_ac', <>冷氣{inp('eq_ac_n', 26)}臺</>)}
                    {ck('eq_hood', <>排油煙機{inp('eq_hood_n', 26)}件</>)}
                    {ck('eq_counter', <>流理台{inp('eq_counter_n', 26)}件</>)}
                    {ck('eq_stove', <>瓦斯爐{inp('eq_stove_n', 26)}臺</>)}
                    {ck('eq_heater', <>熱水器{inp('eq_heater_n', 26)}臺</>)}
                    {ck('eq_gas', '天然瓦斯')}
                    {ck('eq_other', <>其他{inp('eq_other_txt', 80)}</>)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p>出租人：{inp('cf_l_sign', 150)}（簽章）</p>
                <p>承租人：{inp('cf_t_sign', 150)}（簽章）</p>
                <p>簽章日期：民國{inp('cf_sign_y', 48)}年{inp('cf_sign_m', 36)}月{inp('cf_sign_d', 36)}日</p>
              </div>
            </section>

            <p className="text-[10px] text-ink-mute text-center mt-8 print:hidden">
              本契約依內政部 113 年 7 月 8 日修正之「住宅租賃契約書範本」製作。附件二（轉租同意確認書）、附件三（修繕確認書）及簽約注意事項詳官方範本全文。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractEditor;
