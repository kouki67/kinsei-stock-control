const STORAGE_KEY = 'kinsei-inventory-demo-v2';
const productsSeed = [
  ['vinyl', 'ハウス用ビニール 0.1mm × 7.5m', 'AG-VN-010-75', '資材', 30, 24500, 8, 4],
  ['drip', '点滴チューブ 16mm（100m巻）', 'AG-DT-16-100', '灌水', 20, 8200, 5, 3],
  ['fertilizer', '液体肥料 20-20-20（20L）', 'FT-202020-20', '肥料', 24, 6800, 5, 13],
  ['shade', '遮光ネット 50%（2m × 50m）', 'AG-SN-50-250', '資材', 20, 12600, 22, 13],
  ['fabric', '農業用不織布 1.8m × 100m', 'AG-NW-18-100', '資材', 25, 9300, 35, 13],
  ['nozzle', '散水ノズル 微細ミスト', 'AG-MN-01', '灌水', 15, 3900, 6, 8]
];
const initialProducts = productsSeed.map(([id, name, code, category, point, price, nagoya, toyohashi]) => ({ id, name, code, category, point, price, warehouses: { 名古屋: nagoya, 豊橋: toyohashi } }));
const initialActivities = [
  { date: '08/20 09:42', product: '点滴チューブ 16mm（100m巻）', type: '出庫', quantity: 12, unit: '巻', person: '田中', site: '名古屋' },
  { date: '08/20 09:10', product: '農業用不織布 1.8m × 100m', type: '入庫', quantity: 20, unit: '巻', person: '鈴木', site: '名古屋' },
  { date: '08/19 16:35', product: '液体肥料 20-20-20（20L）', type: '出庫', quantity: 6, unit: '缶', person: '佐藤', site: '豊橋' }
];
const initialOrders = [
  { id: 'IN-0820-001', date: '2026-08-20', type: '入荷予定', productId: 'vinyl', quantity: 25, warehouse: '名古屋', status: '入荷予定' },
  { id: 'OUT-0820-014', date: '2026-08-20', type: '出荷予定', productId: 'drip', quantity: 6, warehouse: '名古屋', status: '出荷予定' },
  { id: 'OUT-0821-003', date: '2026-08-21', type: '出荷予定', productId: 'fertilizer', quantity: 8, warehouse: '豊橋', status: '出荷予定' },
  { id: 'IN-0819-011', date: '2026-08-19', type: '入荷予定', productId: 'fabric', quantity: 20, warehouse: '名古屋', status: '完了' }
];
const copy = (value) => JSON.parse(JSON.stringify(value));
const defaultState = () => ({ products: copy(initialProducts), activities: copy(initialActivities), orders: copy(initialOrders), todayCount: 0 });
const loadState = () => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved?.products?.[0]?.warehouses ? saved : defaultState(); } catch { return defaultState(); } };
let state = loadState(); let transactionType = '入庫'; let orderFilter = 'all';
const $ = (selector) => document.querySelector(selector);
const total = (product) => Object.values(product.warehouses).reduce((sum, count) => sum + count, 0);
const unitFor = (product) => product.category === '肥料' ? '缶' : product.id === 'nozzle' ? '個' : '巻';
const getStatus = (product) => total(product) <= product.point / 2 ? ['残りわずか', 'critical'] : total(product) < product.point ? ['発注点以下', 'low'] : ['適正在庫', 'normal'];
const money = (value) => `¥${new Intl.NumberFormat('ja-JP').format(value)}`;
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const toast = (message) => { const element = $('#toast'); element.textContent = message; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 2600); };
const now = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const productById = (id) => state.products.find((product) => product.id === id);
const options = () => state.products.map((product) => `<option value="${product.id}">${product.name}（合計 ${total(product)}${unitFor(product)}）</option>`).join('');

const renderMetrics = () => { const reorder = state.products.filter((p) => total(p) < p.point); const urgent = state.products.filter((p) => total(p) <= p.point / 2); $('#itemCount').innerHTML = `${state.products.length}<span>品目</span>`; $('#reorderCount').innerHTML = `${reorder.length}<span>品目</span>`; $('#urgentCount').textContent = `${urgent.length}品目`; $('#inventoryValue').textContent = money(state.products.reduce((sum, p) => sum + total(p) * p.price, 0)); $('#todayTransactionCount').innerHTML = `${state.todayCount}<span>件</span>`; };
const renderActions = () => { $('#actionList').innerHTML = state.products.filter((p) => total(p) < p.point).sort((a, b) => total(a) / a.point - total(b) / b.point).slice(0, 3).map((p) => { const [, level] = getStatus(p); return `<div class="action-item"><span class="action-status ${level === 'critical' ? 'urgent' : ''}"></span><div><b>${p.name}</b><small>名古屋 ${p.warehouses.名古屋} / 豊橋 ${p.warehouses.豊橋}　発注点 ${p.point}</small></div><span class="quantity ${level === 'critical' ? 'urgent' : ''}">残 ${total(p)}</span></div>`; }).join('') || '<p class="all-clear">発注が必要な品目はありません。</p>'; };
const activityRows = (target, items) => { $(target).innerHTML = items.map((a) => `<tr><td>${a.date}</td><td>${a.product}</td><td><span class="badge ${a.type === '出庫' ? 'out' : ''}">${a.type}</span></td><td>${a.type === '出庫' ? '−' : '+'}${a.quantity} ${a.unit}</td><td>${a.person}</td><td>${a.site}</td></tr>`).join(''); };
const renderActivities = () => { activityRows('#recentRows', state.activities.slice(0, 5)); activityRows('#historyRows', state.activities); };
const renderWarehouses = () => { const count = (warehouse) => state.products.reduce((sum, p) => sum + p.warehouses[warehouse], 0); $('#warehouseSummary').innerHTML = ['名古屋', '豊橋'].map((warehouse) => `<article class="warehouse-card"><p>${warehouse}${warehouse === '名古屋' ? '本社' : '営業所'}</p><strong>${count(warehouse)}<span>点</span></strong><small>在庫評価額 ${money(state.products.reduce((sum, p) => sum + p.warehouses[warehouse] * p.price, 0))}</small></article>`).join(''); };
const renderInventory = () => { const query = $('#inventorySearch').value.trim().toLowerCase(); const category = $('#categoryFilter').value; const warehouse = $('#warehouseFilter').value; const items = state.products.filter((p) => Object.values(p).join(' ').toLowerCase().includes(query) && (!category || p.category === category) && (!warehouse || p.warehouses[warehouse] > 0)); $('#inventoryRows').innerHTML = items.map((p) => { const [label, level] = getStatus(p); return `<tr><td><b>${p.name}</b></td><td>${p.code}</td><td>${p.warehouses.名古屋} ${unitFor(p)}</td><td>${p.warehouses.豊橋} ${unitFor(p)}</td><td><b>${total(p)} ${unitFor(p)}</b></td><td><span class="status ${level}">${label}</span></td></tr>`; }).join('') || '<tr><td colspan="6">該当する品目がありません。</td></tr>'; };
const renderOrders = () => { const items = state.orders.filter((o) => orderFilter === 'all' || o.status === orderFilter); $('#orderRows').innerHTML = items.map((o) => { const p = productById(o.productId); return `<tr><td>${o.date}</td><td>${o.id}</td><td><span class="badge ${o.type === '出荷予定' ? 'out' : ''}">${o.type}</span></td><td>${p.name}</td><td>${o.quantity} ${unitFor(p)}</td><td>${o.warehouse}</td><td><button class="status ${o.status === '出荷予定' ? 'low' : ''} order-complete" data-id="${o.id}" ${o.status === '完了' ? 'disabled' : ''}>${o.status === '完了' ? '完了' : '完了にする'}</button></td></tr>`; }).join(''); $('#pickingCount').textContent = `${state.orders.filter((o) => o.status === '出荷予定').length}件`; document.querySelectorAll('.order-complete').forEach((button) => button.addEventListener('click', completeOrder)); };
const renderOptions = () => { ['transactionProduct', 'transferProduct', 'orderProduct'].forEach((id) => { $(`#${id}`).innerHTML = options(); }); };
const render = () => { renderMetrics(); renderActions(); renderActivities(); renderWarehouses(); renderInventory(); renderOrders(); renderOptions(); };
const addActivity = (product, type, quantity, site) => { state.activities.unshift({ date: now(), product: product.name, type, quantity, unit: unitFor(product), person: '管理者', site }); state.todayCount += 1; };
const completeOrder = (event) => { const order = state.orders.find((item) => item.id === event.currentTarget.dataset.id); const product = productById(order.productId); if (order.type === '出荷予定' && product.warehouses[order.warehouse] < order.quantity) return toast(`${order.warehouse}の在庫が不足しています。`); product.warehouses[order.warehouse] += order.type === '入荷予定' ? order.quantity : -order.quantity; order.status = '完了'; addActivity(product, order.type === '入荷予定' ? '入庫' : '出庫', order.quantity, order.warehouse); save(); render(); toast(`${order.id}を完了しました。`); };

render();
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { const view = button.dataset.view; document.querySelectorAll('[data-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== view)); document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view)); $('.sidebar').classList.remove('open'); }));
['inventorySearch', 'categoryFilter', 'warehouseFilter'].forEach((id) => $(`#${id}`).addEventListener(id === 'inventorySearch' ? 'input' : 'change', renderInventory));
$('.menu-button').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
const closeTopMenus = () => document.querySelectorAll('.top-menu').forEach((menu) => menu.classList.add('hidden'));
const toggleTopMenu = (id) => { const menu = $(`#${id}`); const willOpen = menu.classList.contains('hidden'); closeTopMenus(); menu.classList.toggle('hidden', !willOpen); };
$('#notificationButton').addEventListener('click', (event) => { event.stopPropagation(); toggleTopMenu('notificationMenu'); });
$('#locationButton').addEventListener('click', (event) => { event.stopPropagation(); toggleTopMenu('locationMenu'); });
$('#profileButton').addEventListener('click', (event) => { event.stopPropagation(); toggleTopMenu('profileMenu'); });
document.querySelectorAll('[data-location]').forEach((button) => button.addEventListener('click', () => { $('#currentLocation').textContent = button.dataset.location; closeTopMenus(); toast(`${button.dataset.location}へ表示を切り替えました。`); }));
$('#profileSettings').addEventListener('click', () => { closeTopMenus(); toast('アカウント設定はデモ画面です。'); });
$('#helpButton').addEventListener('click', () => { closeTopMenus(); toast('入荷・出荷・倉庫移動は各画面から登録できます。'); });
document.addEventListener('click', closeTopMenus);
document.querySelectorAll('[data-range]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-range]').forEach((item) => item.classList.toggle('selected', item === button)); $('#chartRangeLabel').textContent = `過去${button.dataset.range}`; }));
$('#newTransaction').addEventListener('click', () => { renderOptions(); $('#modal').classList.remove('hidden'); }); $('#modalClose').addEventListener('click', () => $('#modal').classList.add('hidden')); $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').classList.add('hidden'); });
document.querySelectorAll('.segmented button').forEach((button) => button.addEventListener('click', () => { transactionType = button.dataset.type; document.querySelectorAll('.segmented button').forEach((item) => item.classList.toggle('selected', item === button)); }));
$('#transactionForm').addEventListener('submit', (e) => { e.preventDefault(); const p = productById($('#transactionProduct').value); const quantity = Number($('#transactionQuantity').value); if (!Number.isInteger(quantity) || quantity < 1) return toast('数量を1以上で入力してください。'); if (transactionType === '出庫' && p.warehouses.名古屋 < quantity) return toast('名古屋本社の在庫が不足しています。'); p.warehouses.名古屋 += transactionType === '入庫' ? quantity : -quantity; addActivity(p, transactionType, quantity, '名古屋'); save(); render(); $('#modal').classList.add('hidden'); toast(`${p.name}を${transactionType}登録しました。`); });
$('#transferForm').addEventListener('submit', (e) => { e.preventDefault(); const p = productById($('#transferProduct').value); const from = $('#transferFrom').value; const to = $('#transferTo').value; const quantity = Number($('#transferQuantity').value); if (from === to) return toast('移動元と移動先を選び直してください。'); if (!Number.isInteger(quantity) || quantity < 1) return toast('数量を1以上で入力してください。'); if (p.warehouses[from] < quantity) return toast(`${from}の在庫が不足しています。`); p.warehouses[from] -= quantity; p.warehouses[to] += quantity; addActivity(p, '移動', quantity, `${from} → ${to}`); save(); render(); toast(`${from}から${to}へ移動を登録しました。`); });
$('#newOrder').addEventListener('click', () => { renderOptions(); $('#orderDate').value = new Date().toISOString().slice(0, 10); $('#orderModal').classList.remove('hidden'); }); $('#orderModalClose').addEventListener('click', () => $('#orderModal').classList.add('hidden')); $('#orderModal').addEventListener('click', (e) => { if (e.target.id === 'orderModal') $('#orderModal').classList.add('hidden'); });
$('#orderForm').addEventListener('submit', (e) => { e.preventDefault(); const type = $('#orderType').value; const serial = String(state.orders.length + 1).padStart(3, '0'); state.orders.unshift({ id: `${type === '入荷予定' ? 'IN' : 'OUT'}-${$('#orderDate').value.replaceAll('-', '').slice(4)}-${serial}`, date: $('#orderDate').value, type, productId: $('#orderProduct').value, quantity: Number($('#orderQuantity').value), warehouse: $('#orderWarehouse').value, status: type }); save(); render(); $('#orderModal').classList.add('hidden'); toast(`${type}伝票を登録しました。`); });
document.querySelectorAll('[data-order-filter]').forEach((button) => button.addEventListener('click', () => { orderFilter = button.dataset.orderFilter; document.querySelectorAll('[data-order-filter]').forEach((item) => item.classList.toggle('selected', item === button)); renderOrders(); }));
$('#resetData').addEventListener('click', () => { state = defaultState(); save(); render(); toast('デモデータに戻しました。'); });
