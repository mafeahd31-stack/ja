const API = '/api/admin';
let TOKEN = localStorage.getItem('admin_token');
let currentPage = 'dashboard';
let currentPageNum = 1;

// ─── Auth ───
async function login() {
  const phone = document.getElementById('loginPhone').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  try {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    TOKEN = data.token;
    localStorage.setItem('admin_token', TOKEN);
    document.getElementById('adminName').textContent = data.admin.name;
    document.getElementById('loginScreen').style.display = 'none';
    loadPage('dashboard');
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  TOKEN = null;
  document.getElementById('loginScreen').style.display = 'flex';
}

// Check login on load
(async function checkLogin() {
  if (TOKEN) {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (res.ok) {
        const data = await res.json();
        document.getElementById('adminName').textContent = data.name || data.phone;
        document.getElementById('loginScreen').style.display = 'none';
        loadPage('dashboard');
        return;
      }
    } catch {}
  }
  document.getElementById('loginScreen').style.display = 'flex';
})();

// ─── Navigation ───
document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('.nav-item.active')?.classList.remove('active');
    item.classList.add('active');
    currentPageNum = 1;
    loadPage(item.dataset.page);
  });
});

async function loadPage(page) {
  currentPage = page;
  const titles = {
    dashboard: 'الرئيسية',
    restaurants: 'المطاعم',
    captains: 'الكباتن',
    users: 'المستخدمين',
    'delivery-rules': 'قواعد التوصيل',
    orders: 'الطلبات',
    logs: 'سجل الحركات',
    'support-numbers': 'الدعم الفني',
    'pending-restaurants': 'طلبات تسجيل المطاعم',
    'pending-captains': 'طلبات تسجيل الكباتن',
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  const content = document.getElementById('pageContent');

  switch (page) {
    case 'dashboard':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadDashboard();
      break;
    case 'restaurants':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadRestaurants();
      break;
    case 'captains':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadCaptains();
      break;
    case 'users':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadUsers();
      break;
    case 'delivery-rules':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadDeliveryRules();
      break;
    case 'orders':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadOrders();
      break;
    case 'logs':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadLogs();
      break;
    case 'support-numbers':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadSupportNumbers();
      break;
    case 'pending-restaurants':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadPendingRestaurants();
      break;
    case 'pending-captains':
      content.innerHTML = '<div style="text-align:center;padding:48px">جاري التحميل...</div>';
      loadPendingCaptains();
      break;
  }
}

// ─── Dashboard ───
async function loadDashboard() {
  try {
    const res = await apiGet('/dashboard');
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    const s = d.stats;

    document.getElementById('pageContent').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">🏪 المطاعم</div>
          <div class="value">${s.restaurants.total}</div>
          <div class="sub">مفتوح: ${s.restaurants.open} | محظور: ${s.restaurants.banned}</div>
        </div>
        <div class="stat-card">
          <div class="label">🛵 الكباتن</div>
          <div class="value">${s.captains.total}</div>
          <div class="sub">متصل: ${s.captains.online} | محظور: ${s.captains.banned}</div>
        </div>
        <div class="stat-card">
          <div class="label">👤 المستخدمين</div>
          <div class="value">${s.users.total}</div>
          <div class="sub">محظور: ${s.users.banned}</div>
        </div>
        <div class="stat-card">
          <div class="label">📋 الطلبات</div>
          <div class="value">${s.orders.total}</div>
          <div class="sub">معلق: ${s.orders.pending} | اليوم: ${s.orders.today}</div>
        </div>
        <div class="stat-card">
          <div class="label">💰 الإيرادات</div>
          <div class="value">${(s.orders.revenue || 0).toLocaleString()}</div>
          <div class="sub">ل.س سورية</div>
        </div>
        <div class="stat-card">
          <div class="label">📊 حالة الطلبات</div>
          <div class="value">${(d.ordersByStatus || []).map(o => `<span class="badge badge-info">${o._id}: ${o.count}</span>`).join(' ')}</div>
        </div>
      </div>
      <div class="section-header"><div class="section-title">آخر الطلبات</div></div>
      <div class="table-card">
        <table>
          <thead><tr><th>#</th><th>المستخدم</th><th>المطعم</th><th>المبلغ</th><th>الحالة</th></tr></thead>
          <tbody>
            ${(d.recentOrders || []).map(o => `
              <tr>
                <td>${o._id?.slice(-6)}</td>
                <td>${o.userId?.name || o.userId?.phone || '-'}</td>
                <td>${o.restaurantId?.nameAr || '-'}</td>
                <td>${o.total?.toLocaleString()} SYP</td>
                <td><span class="badge badge-info status-${o.status || 'pending'}">${o.status || '-'}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center">لا توجد طلبات</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل البيانات</div>`;
  }
}

// ─── Restaurants ───
async function loadRestaurants(search = '', bannedFilter = '') {
  let url = `${API}/restaurants?page=${currentPageNum}&limit=20`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (bannedFilter) url += `&banned=${bannedFilter}`;

  try {
    const res = await apiGet(url);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">المطاعم</div>
        <div class="search-bar">
          <input type="text" id="restaurantSearch" placeholder="بحث..." onkeyup="if(event.key==='Enter'){currentPageNum=1;loadRestaurants(this.value,document.querySelector('.filter-btn.active')?.dataset?.filter || '')}">
          <button class="filter-btn ${!bannedFilter ? 'active' : ''}" data-filter="" onclick="currentPageNum=1;this.parentElement.parentElement.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');loadRestaurants(document.getElementById('restaurantSearch').value,this.dataset.filter)">الكل</button>
          <button class="filter-btn ${bannedFilter==='true' ? 'active' : ''}" data-filter="true" onclick="currentPageNum=1;this.parentElement.parentElement.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');loadRestaurants(document.getElementById('restaurantSearch').value,this.dataset.filter)">محظور</button>
          <button class="filter-btn ${bannedFilter==='false' ? 'active' : ''}" data-filter="false" onclick="currentPageNum=1;this.parentElement.parentElement.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');loadRestaurants(document.getElementById('restaurantSearch').value,this.dataset.filter)">نشط</button>
        </div>
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>التقييم</th><th>حالة</th><th>الكباتن</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${(d.restaurants || []).map(r => `
              <tr>
                <td><strong>${r.nameAr}</strong><br><small style="color:var(--text-light)">${r.name}</small></td>
                <td>${r.phone || '-'}</td>
                <td>${r.rating || 0} ⭐ (${r.ratingCount || 0})</td>
                <td>${r.isBanned ? '<span class="badge badge-danger">محظور</span>' : r.isOpen ? '<span class="badge badge-success">مفتوح</span>' : '<span class="badge badge-warning">مغلق</span>'}</td>
                <td>${(r.affiliatedCaptains || []).length}</td>
                <td>
                  ${r.isBanned
                    ? `<button class="action-btn btn-unban" onclick="unban('restaurants','${r._id}')">فك حظر</button>`
                    : `<button class="action-btn btn-ban" onclick="showBanModal('restaurants','${r._id}','${r.nameAr}')">حظر</button>`
                  }
                  <button class="action-btn btn-edit" onclick="showRestaurantZones('${r._id}','${r.nameAr}',${r.freeDeliveryRadius || 3})">مناطق</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center">لا توجد مطاعم</td></tr>'}
          </tbody>
        </table>
        ${pagination(d.pagination, 'loadRestaurants', search, bannedFilter)}
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل المطاعم</div>`;
  }
}

// ─── Captains ───
async function loadCaptains(search = '', bannedFilter = '') {
  let url = `${API}/captains?page=${currentPageNum}&limit=20`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (bannedFilter) url += `&banned=${bannedFilter}`;

  try {
    const res = await apiGet(url);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">الكباتن</div>
        <div class="search-bar">
          <input type="text" id="captainSearch" placeholder="بحث..." onkeyup="if(event.key==='Enter'){currentPageNum=1;loadCaptains(this.value,document.querySelector('#captainFilter .active')?.dataset?.filter || '')}">
          <div id="captainFilter">
            <button class="filter-btn ${!bannedFilter ? 'active' : ''}" data-filter="" onclick="currentPageNum=1;toggleFilter(this);loadCaptains(document.getElementById('captainSearch').value,this.dataset.filter)">الكل</button>
            <button class="filter-btn ${bannedFilter==='true' ? 'active' : ''}" data-filter="true" onclick="currentPageNum=1;toggleFilter(this);loadCaptains(document.getElementById('captainSearch').value,this.dataset.filter)">محظور</button>
            <button class="filter-btn ${bannedFilter==='false' ? 'active' : ''}" data-filter="false" onclick="currentPageNum=1;toggleFilter(this);loadCaptains(document.getElementById('captainSearch').value,this.dataset.filter)">نشط</button>
          </div>
        </div>
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>المركبة</th><th>التقييم</th><th>حالة</th><th>العمولة</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${(d.captains || []).map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone}</td>
                <td>${c.vehicleType === 'motorcycle' ? 'دراجة' : c.vehicleType === 'car' ? 'سيارة' : 'دراجة هوائية'}</td>
                <td>${c.rating || 0} ⭐ (${c.ratingCount || 0})</td>
                <td>${c.isBanned ? '<span class="badge badge-danger">محظور</span>' : c.isOnline ? '<span class="badge badge-success">متصل</span>' : '<span class="badge badge-warning">غير متصل</span>'}</td>
                <td>${c.commissionRate || 0}%</td>
                <td>
                  ${c.isBanned
                    ? `<button class="action-btn btn-unban" onclick="unban('captains','${c._id}')">فك حظر</button>`
                    : `<button class="action-btn btn-ban" onclick="showBanModal('captains','${c._id}','${c.name}')">حظر</button>`
                  }
                  <button class="action-btn btn-edit" onclick="showCommissionModal('${c._id}','${c.name}',${c.commissionRate || 0})">نسبة</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center">لا يوجد كباتن</td></tr>'}
          </tbody>
        </table>
        ${pagination(d.pagination, 'loadCaptains', search, bannedFilter)}
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل الكباتن</div>`;
  }
}

// ─── Users ───
async function loadUsers(search = '', bannedFilter = '') {
  let url = `${API}/users?page=${currentPageNum}&limit=20`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (bannedFilter) url += `&banned=${bannedFilter}`;

  try {
    const res = await apiGet(url);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">المستخدمين</div>
        <div class="search-bar">
          <input type="text" id="userSearch" placeholder="بحث..." onkeyup="if(event.key==='Enter'){currentPageNum=1;loadUsers(this.value)}">
          <button class="filter-btn ${!bannedFilter ? 'active' : ''}" onclick="currentPageNum=1;toggleFilter(this);loadUsers(document.getElementById('userSearch').value,'')">الكل</button>
          <button class="filter-btn ${bannedFilter==='true' ? 'active' : ''}" onclick="currentPageNum=1;toggleFilter(this);loadUsers(document.getElementById('userSearch').value,'true')">محظور</button>
        </div>
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>الرصيد</th><th>نقاط الولاء</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${(d.users || []).map(u => `
              <tr>
                <td><strong>${u.name || '—'}</strong></td>
                <td>${u.phone}</td>
                <td>${(u.shamCashBalance || 0).toLocaleString()} SYP</td>
                <td>${u.loyaltyPoints || 0}</td>
                <td>${u.isBanned ? '<span class="badge badge-danger">محظور</span>' : '<span class="badge badge-success">نشط</span>'}</td>
                <td>
                  ${u.isBanned
                    ? `<button class="action-btn btn-unban" onclick="unban('users','${u._id}')">فك حظر</button>`
                    : `<button class="action-btn btn-ban" onclick="showBanModal('users','${u._id}','${u.name || u.phone}')">حظر</button>`
                  }
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center">لا يوجد مستخدمين</td></tr>'}
          </tbody>
        </table>
        ${pagination(d.pagination, 'loadUsers', search, bannedFilter)}
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل المستخدمين</div>`;
  }
}

// ─── Delivery Rules ───
async function loadDeliveryRules() {
  try {
    const res = await apiGet(`${API}/delivery-rules`);
    const rules = await res.json();
    if (!res.ok) throw new Error(rules.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">قواعد التوصيل</div>
        <button class="filter-btn" onclick="showRuleModal(null)">+ إضافة قاعدة</button>
      </div>
      <div class="form-card" style="margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-light);margin-bottom:8px">
          <strong>💡 كيفية العمل:</strong> كل قاعدة تحدد النسبة لكل مسافة. مثلاً: من 0-3 كم = 0% عمولة (توصيل مجاني)، من 3-7 كم = 10%، إلخ.
          الأولوية الأعلى تُطبق أولاً.
        </div>
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>من (كم)</th><th>إلى (كم)</th><th>نوع العمولة</th><th>القيمة</th><th>نسبة المطعم</th><th>نسبة الكابتن</th><th>الحالة</th><th>الأولوية</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${(rules || []).map(r => `
              <tr>
                <td><strong>${r.nameAr || r.name}</strong></td>
                <td>${r.minDistanceKm}</td>
                <td>${r.maxDistanceKm}</td>
                <td>${r.commissionType === 'percentage' ? 'نسبة مئوية' : 'قيمة ثابتة'}</td>
                <td>${r.commissionValue}${r.commissionType === 'percentage' ? '%' : ' SYP'}</td>
                <td>${r.restaurantCommission || 0}%</td>
                <td>${r.captainCommission || 0}%</td>
                <td>${r.isActive ? '<span class="badge badge-success">فعال</span>' : '<span class="badge badge-warning">موقف</span>'}</td>
                <td>${r.priority || 0}</td>
                <td>
                  <button class="action-btn btn-edit" onclick="showRuleModal('${r._id}','${r.name}','${r.nameAr}','${r.minDistanceKm}','${r.maxDistanceKm}','${r.commissionType}','${r.commissionValue}','${r.restaurantCommission}','${r.captainCommission}','${r.priority}','${r.isActive}')">تعديل</button>
                  <button class="action-btn btn-delete" onclick="deleteRule('${r._id}')">حذف</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="10" style="text-align:center">لا توجد قواعد. أضف أول قاعدة!</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل قواعد التوصيل</div>`;
  }
}

// ─── Orders ───
async function loadOrders(status = '') {
  let url = `${API}/orders?page=${currentPageNum}&limit=20`;
  if (status) url += `&status=${status}`;

  try {
    const res = await apiGet(url);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    const statuses = ['', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];
    const statusLabels = ['الكل', 'معلق', 'مؤكد', 'بالتحضير', 'جاهز', 'مستلم', 'بالتوصيل', 'تم التوصيل', 'ملغي'];

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">الطلبات</div>
      </div>
      <div class="tabs">
        ${statuses.map((s, i) => `
          <button class="tab ${s === status ? 'active' : ''}" onclick="currentPageNum=1;loadOrders('${s}')">${statusLabels[i]}</button>
        `).join('')}
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>#</th><th>المستخدم</th><th>المطعم</th><th>المبلغ</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>
            ${(d.orders || []).map(o => `
              <tr>
                <td>#${o._id?.slice(-6)}</td>
                <td>${o.userId?.name || o.userId?.phone || '-'}</td>
                <td>${o.restaurantId?.nameAr || '-'}</td>
                <td>${(o.total || 0).toLocaleString()} SYP</td>
                <td>${o.paymentMethod === 'cash' ? 'كاش' : o.paymentMethod === 'sham_cash' ? 'شام كاش' : o.paymentMethod}</td>
                <td><span class="badge badge-info status-${o.status || 'pending'}">${o.status || '-'}</span></td>
                <td>${new Date(o.createdAt).toLocaleDateString('ar-SA')}</td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center">لا توجد طلبات</td></tr>'}
          </tbody>
        </table>
        ${pagination(d.pagination, 'loadOrders', status)}
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل الطلبات</div>`;
  }
}

// ─── Logs ───
async function loadLogs() {
  try {
    const res = await apiGet(`${API}/logs?page=${currentPageNum}&limit=50`);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header"><div class="section-title">سجل حركات الأدمن</div></div>
      <div class="table-card">
        <table>
          <thead><tr><th>التاريخ</th><th>الأدمن</th><th>الإجراء</th><th>التفاصيل</th></tr></thead>
          <tbody>
            ${(d.logs || []).map(l => `
              <tr>
                <td>${new Date(l.createdAt).toLocaleString('ar-SA')}</td>
                <td>${l.adminId?.name || '—'}</td>
                <td>${l.action}</td>
                <td>${l.details || '—'}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center">لا توجد حركات</td></tr>'}
          </tbody>
        </table>
        ${pagination(d.pagination, 'loadLogs')}
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل السجل</div>`;
  }
}

// ─── API Helper ───
async function apiGet(url) {
  return fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
}

async function apiPost(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
}

async function apiPut(url, body) {
  return fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
}

async function apiDelete(url) {
  return fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } });
}

// ─── Pagination ───
function pagination(p, fn, ...args) {
  if (!p || p.pages <= 1) return '';
  return `
    <div class="pagination">
      <button class="page-btn" onclick="currentPageNum=${Math.max(1, p.page - 1)};${fn}('${args.join("','")}')" ${p.page <= 1 ? 'disabled' : ''}>← السابق</button>
      <span class="page-info">صفحة ${p.page} من ${p.pages} (${p.total} المجموع)</span>
      <button class="page-btn" onclick="currentPageNum=${Math.min(p.pages, p.page + 1)};${fn}('${args.join("','")}')" ${p.page >= p.pages ? 'disabled' : ''}>التالي →</button>
    </div>
  `;
}

// ─── Toggle Filter ───
function toggleFilter(el) {
  el.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// ─── Ban / Unban ───
async function showBanModal(type, id, name) {
  const reason = prompt(`سبب حظر ${name}:`);
  if (!reason) return;

  const res = await apiPut(`${API}/${type}/${id}/ban`, { reason });
  const d = await res.json();
  if (res.ok) { alert('✅ تم الحظر'); loadPage(currentPage); }
  else { alert('❌ ' + (d.error || 'فشل الحظر')); }
}

async function unban(type, id) {
  if (!confirm('تأكيد فك الحظر?')) return;
  const res = await apiPut(`${API}/${type}/${id}/unban`, {});
  const d = await res.json();
  if (res.ok) { alert('✅ تم فك الحظر'); loadPage(currentPage); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

// ─── Commission Modal ───
async function showCommissionModal(id, name, currentRate) {
  const rate = prompt(`نسبة عمولة ${name} (مثلاً 10 = 10%):`, currentRate);
  if (rate === null) return;

  const res = await apiPut(`${API}/captains/${id}/commission`, { commissionRate: parseFloat(rate) });
  const d = await res.json();
  if (res.ok) { alert('✅ تم تحديث النسبة'); loadPage(currentPage); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

// ─── Restaurant Zones Modal ───
async function showRestaurantZones(id, name, currentRadius) {
  const radius = prompt(`نصف قطر التوصيل المجاني لـ ${name} (بالكيلومتر):`, currentRadius);
  if (radius === null) return;

  const res = await apiPut(`/api/restaurants/${id}/delivery-zones`, { freeDeliveryRadius: parseFloat(radius) });
  const d = await res.json();
  if (res.ok) { alert('✅ تم تحديث منطقة التوصيل'); loadPage(currentPage); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

// ─── Delivery Rule Modal ───
async function showRuleModal(id, name, nameAr, minDist, maxDist, type, value, restComm, capComm, priority, isActive) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'ruleModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">${id ? 'تعديل قاعدة' : 'إضافة قاعدة جديدة'}</div>
      <div class="form-field" style="margin-bottom:12px">
        <label>الاسم (عربي)</label>
        <input type="text" id="ruleNameAr" value="${nameAr || ''}" placeholder="مثال: ضمن النطاق">
      </div>
      <div class="form-field" style="margin-bottom:12px">
        <label>الاسم (إنجليزي)</label>
        <input type="text" id="ruleName" value="${name || ''}" placeholder="مثال: Within Range">
      </div>
      <div class="form-group">
        <div class="form-field">
          <label>من (كم)</label>
          <input type="number" id="ruleMin" value="${minDist || '0'}" step="0.1">
        </div>
        <div class="form-field">
          <label>إلى (كم)</label>
          <input type="number" id="ruleMax" value="${maxDist || ''}" step="0.1">
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label>نوع العمولة</label>
          <select id="ruleType">
            <option value="percentage" ${type === 'percentage' ? 'selected' : ''}>نسبة مئوية</option>
            <option value="fixed" ${type === 'fixed' ? 'selected' : ''}>قيمة ثابتة</option>
          </select>
        </div>
        <div class="form-field">
          <label>القيمة</label>
          <input type="number" id="ruleValue" value="${value || '10'}" step="0.1">
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label>نسبة المطعم (%)</label>
          <input type="number" id="ruleRest" value="${restComm || '0'}">
        </div>
        <div class="form-field">
          <label>نسبة الكابتن (%)</label>
          <input type="number" id="ruleCap" value="${capComm || '0'}">
        </div>
      </div>
      <div class="form-group">
        <div class="form-field">
          <label>الأولوية (أكبر = أسرع)</label>
          <input type="number" id="rulePriority" value="${priority || '0'}">
        </div>
        <div class="form-field">
          <label>الحالة</label>
          <select id="ruleActive">
            <option value="true" ${isActive === 'true' || !isActive ? 'selected' : ''}>فعال</option>
            <option value="false" ${isActive === 'false' ? 'selected' : ''}>موقف</option>
          </select>
        </div>
      </div>
      <button class="submit-btn" onclick="saveRule('${id || ''}')">${id ? 'تحديث' : 'إضافة'}</button>
      <button class="submit-btn" style="background:var(--danger);margin-right:8px" onclick="document.getElementById('ruleModal').remove()">إلغاء</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveRule(id) {
  const data = {
    name: document.getElementById('ruleName').value,
    nameAr: document.getElementById('ruleNameAr').value,
    minDistanceKm: parseFloat(document.getElementById('ruleMin').value),
    maxDistanceKm: parseFloat(document.getElementById('ruleMax').value),
    commissionType: document.getElementById('ruleType').value,
    commissionValue: parseFloat(document.getElementById('ruleValue').value),
    restaurantCommission: parseFloat(document.getElementById('ruleRest').value),
    captainCommission: parseFloat(document.getElementById('ruleCap').value),
    priority: parseFloat(document.getElementById('rulePriority').value),
    isActive: document.getElementById('ruleActive').value === 'true',
  };

  try {
    const res = id
      ? await apiPut(`${API}/delivery-rules/${id}`, data)
      : await apiPost(`${API}/delivery-rules`, data);
    const d = await res.json();

    if (res.ok) {
      alert('✅ تم حفظ القاعدة');
      document.getElementById('ruleModal').remove();
      loadPage('delivery-rules');
    } else {
      alert('❌ ' + (d.error || 'فشل الحفظ'));
    }
  } catch (e) {
    alert('❌ خطأ في الحفظ');
  }
}

async function deleteRule(id) {
  if (!confirm('تأكيد حذف القاعدة?')) return;
  const res = await apiDelete(`${API}/delivery-rules/${id}`);
  if (res.ok) { alert('✅ تم الحذف'); loadPage('delivery-rules'); }
  else alert('❌ فشل الحذف');
}

// ─── Pending Restaurants (Registration Requests) ───
async function loadPendingRestaurants() {
  try {
    const res = await apiGet(`${API}/restaurants/pending`);
    const restaurants = await res.json();
    if (!res.ok) throw new Error(restaurants.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">طلبات تسجيل مطاعم جديدة</div>
        <button class="filter-btn" onclick="loadPendingRestaurants()">↻ تحديث</button>
      </div>
      ${(restaurants || []).length === 0 ? '<div class="empty-state"><div class="icon">✅</div>لا توجد طلبات تسجيل جديدة</div>' : `
      <div class="table-card">
        <table>
          <thead><tr><th>المطعم</th><th>صاحب المطعم</th><th>الهاتف</th><th>التفاصيل</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${restaurants.map(r => `
              <tr>
                <td><strong>${r.nameAr || r.name}</strong></td>
                <td>${r.ownerName || '—'}</td>
                <td>${r.phone || r.ownerPhone || '—'}</td>
                <td>
                  ${r.latitude && r.longitude ? `<span class="badge badge-info">📍 ${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</span>` : ''}
                  ${r.cuisine?.length ? `<span class="badge badge-info">🍽 ${r.cuisine.join(', ')}</span>` : ''}
                </td>
                <td>${new Date(r.createdAt).toLocaleDateString('ar-SA')}</td>
                <td>
                  <button class="action-btn btn-success" onclick="approveRestaurant('${r._id}')">✅ قبول</button>
                  <button class="action-btn btn-ban" onclick="rejectRestaurant('${r._id}')">❌ رفض</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
      <div class="section-header" style="margin-top:24px">
        <div class="section-title">جميع المطاعم المعتمدة</div>
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>المطعم</th><th>صاحب المطعم</th><th>الهاتف</th><th>الحالة</th></tr></thead>
          <tbody id="approvedRestaurantsBody">
            <tr><td colspan="4" style="text-align:center">جاري التحميل...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    // Load approved restaurants
    const approvedRes = await apiGet(`${API}/restaurants/approved`);
    const approvedData = await approvedRes.json();
    const approvedBody = document.getElementById('approvedRestaurantsBody');
    if (approvedBody) {
      approvedBody.innerHTML = (approvedData || []).length === 0
        ? '<tr><td colspan="4" style="text-align:center">لا توجد مطاعم معتمدة</td></tr>'
        : approvedData.map(r => `
            <tr>
              <td><strong>${r.nameAr || r.name}</strong></td>
              <td>${r.ownerName || '—'}</td>
              <td>${r.phone || '—'}</td>
              <td>${r.isOpen ? '<span class="badge badge-success">مفتوح</span>' : '<span class="badge badge-warning">مغلق</span>'}</td>
            </tr>
          `).join('');
    }
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل الطلبات</div>`;
  }
}

async function approveRestaurant(id) {
  if (!confirm('تأكيد قبول المطعم؟')) return;
  const res = await apiPut(`${API}/restaurants/${id}/approve`, {});
  const d = await res.json();
  if (res.ok) { alert('✅ تم قبول المطعم'); loadPage('pending-restaurants'); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

async function rejectRestaurant(id) {
  const reason = prompt('سبب الرفض:');
  if (!reason) return;
  const res = await apiPut(`${API}/restaurants/${id}/reject`, { reason });
  const d = await res.json();
  if (res.ok) { alert('✅ تم رفض المطعم'); loadPage('pending-restaurants'); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

// ─── Pending Captains (Registration Requests) ───
async function loadPendingCaptains() {
  try {
    const res = await apiGet(`${API}/captains/pending`);
    const captains = await res.json();
    if (!res.ok) throw new Error(captains.error);

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">طلبات تسجيل كباتن جدد</div>
        <button class="filter-btn" onclick="loadPendingCaptains()">↻ تحديث</button>
      </div>
      ${(captains || []).length === 0 ? '<div class="empty-state"><div class="icon">✅</div>لا توجد طلبات تسجيل جديدة</div>' : `
      <div class="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>العمر</th><th>رقم الهاتف</th><th>المركبة</th><th>الرخصة</th><th>صورة المركبة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${captains.map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.age || '—'}</td>
                <td>${c.phone}</td>
                <td>${c.vehicleType === 'motorcycle' ? '🏍 دراجة' : c.vehicleType === 'car' ? '🚗 سيارة' : '🚲 دراجة هوائية'}</td>
                <td>${c.drivingLicense ? `<a href="${c.drivingLicense}" target="_blank" class="action-btn btn-edit" style="padding:2px 8px;font-size:11px">📎 عرض</a>` : '—'}</td>
                <td>${c.vehicleImageUrl ? `<a href="${c.vehicleImageUrl}" target="_blank" class="action-btn btn-edit" style="padding:2px 8px;font-size:11px">📎 عرض</a>` : '—'}</td>
                <td>${new Date(c.createdAt).toLocaleDateString('ar-SA')}</td>
                <td>
                  <button class="action-btn btn-success" onclick="approveCaptain('${c._id}')">✅ قبول</button>
                  <button class="action-btn btn-ban" onclick="rejectCaptain('${c._id}')">❌ رفض</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`}
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل الطلبات</div>`;
  }
}

async function approveCaptain(id) {
  if (!confirm('تأكيد قبول الكابتن؟')) return;
  const res = await apiPut(`${API}/captains/${id}/approve`, {});
  const d = await res.json();
  if (res.ok) { alert('✅ تم قبول الكابتن'); loadPage('pending-captains'); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

async function rejectCaptain(id) {
  const reason = prompt('سبب الرفض:');
  if (!reason) return;
  const res = await apiPut(`${API}/captains/${id}/reject`, { reason });
  const d = await res.json();
  if (res.ok) { alert('✅ تم رفض الكابتن'); loadPage('pending-captains'); }
  else { alert('❌ ' + (d.error || 'فشل')); }
}

// ─── Support Numbers ───
async function loadSupportNumbers() {
  try {
    const res = await apiGet(`${API}/support-numbers`);
    const numbers = await res.json();
    if (!res.ok) throw new Error(numbers.error);

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    document.getElementById('pageContent').innerHTML = `
      <div class="section-header">
        <div class="section-title">أرقام الدعم الفني</div>
        <button class="filter-btn" onclick="showSupportModal(null)">+ إضافة رقم</button>
      </div>
      <div class="form-card" style="margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-light)">
          <strong>💡 كيفية العمل:</strong> أضف أرقام واتساب للدعم الفني. كل رقم له أوقات دوام (مثلاً 09:00 - 17:00) وأيام عمل.
          التطبيق يعرض الأرقام النشطة فقط خلال أوقات الدوام.
        </div>
      </div>
      <div class="table-card">
        <table>
          <thead><tr><th>الاسم</th><th>الهاتف</th><th>بداية الدوام</th><th>نهاية الدوام</th><th>أيام العمل</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${(numbers || []).map(n => `
              <tr>
                <td><strong>${n.nameAr}</strong><br><small style="color:var(--text-light)">${n.name}</small></td>
                <td><a href="https://wa.me/${n.phone}" target="_blank">${n.phone}</a></td>
                <td>${n.workStart}</td>
                <td>${n.workEnd}</td>
                <td>${(n.daysOfWeek || []).map(d => dayNames[d]).join('، ')}</td>
                <td>${n.isActive ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-warning">موقف</span>'}</td>
                <td>
                  <button class="action-btn btn-edit" onclick="showSupportModal('${n._id}','${n.name}','${n.nameAr}','${n.phone}','${n.workStart}','${n.workEnd}','${n.daysOfWeek.join(',')}','${n.isActive}')">تعديل</button>
                  <button class="action-btn btn-delete" onclick="deleteSupportNumber('${n._id}')">حذف</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center">لا توجد أرقام دعم فني. أضف أول رقم!</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    document.getElementById('pageContent').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>خطأ في تحميل أرقام الدعم الفني</div>`;
  }
}

function showSupportModal(id, name, nameAr, phone, workStart, workEnd, daysStr, isActive) {
  const days = daysStr ? daysStr.split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6];
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'supportModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-title">${id ? 'تعديل رقم الدعم الفني' : 'إضافة رقم دعم فني جديد'}</div>
      <div class="form-field" style="margin-bottom:12px">
        <label>الاسم (عربي)</label>
        <input type="text" id="supportNameAr" value="${nameAr || ''}" placeholder="مثال: دعم الشام">
      </div>
      <div class="form-field" style="margin-bottom:12px">
        <label>الاسم (إنجليزي)</label>
        <input type="text" id="supportName" value="${name || ''}" placeholder="مثال: Sham Support">
      </div>
      <div class="form-field" style="margin-bottom:12px">
        <label>رقم الواتساب (مع مفتاح الدولة)</label>
        <input type="text" id="supportPhone" value="${phone || ''}" placeholder="مثال: 963944567890" dir="ltr">
      </div>
      <div class="form-group">
        <div class="form-field">
          <label>بداية الدوام</label>
          <input type="time" id="supportStart" value="${workStart || '09:00'}">
        </div>
        <div class="form-field">
          <label>نهاية الدوام</label>
          <input type="time" id="supportEnd" value="${workEnd || '17:00'}">
        </div>
      </div>
      <div class="form-field" style="margin-bottom:12px">
        <label>أيام العمل</label>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
          ${dayNames.map((d, i) => `
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;padding:4px 8px;background:${days.includes(i) ? 'var(--primary)' : '#eee'};color:${days.includes(i) ? '#fff' : '#333'};border-radius:4px;transition:all .2s">
              <input type="checkbox" value="${i}" ${days.includes(i) ? 'checked' : ''} style="display:none" onchange="this.parentElement.style.background=this.checked?'var(--primary)':'#eee';this.parentElement.style.color=this.checked?'#fff':'#333'">
              ${d}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-field" style="margin-bottom:12px">
        <label>الحالة</label>
        <select id="supportActive">
          <option value="true" ${isActive !== 'false' ? 'selected' : ''}>نشط</option>
          <option value="false" ${isActive === 'false' ? 'selected' : ''}>موقف</option>
        </select>
      </div>
      <button class="submit-btn" onclick="saveSupportNumber('${id || ''}')">${id ? 'تحديث' : 'إضافة'}</button>
      <button class="submit-btn" style="background:var(--danger);margin-right:8px" onclick="document.getElementById('supportModal').remove()">إلغاء</button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveSupportNumber(id) {
  const checkboxes = document.querySelectorAll('#supportModal input[type="checkbox"]:checked');
  const daysOfWeek = Array.from(checkboxes).map(cb => parseInt(cb.value));

  if (daysOfWeek.length === 0) {
    alert('يرجى اختيار يوم عمل واحد على الأقل');
    return;
  }

  const data = {
    name: document.getElementById('supportName').value,
    nameAr: document.getElementById('supportNameAr').value,
    phone: document.getElementById('supportPhone').value,
    workStart: document.getElementById('supportStart').value,
    workEnd: document.getElementById('supportEnd').value,
    daysOfWeek,
    isActive: document.getElementById('supportActive').value === 'true',
  };

  try {
    const res = id
      ? await apiPut(`${API}/support-numbers/${id}`, data)
      : await apiPost(`${API}/support-numbers`, data);
    const d = await res.json();

    if (res.ok) {
      alert('✅ تم حفظ الرقم');
      document.getElementById('supportModal').remove();
      loadPage('support-numbers');
    } else {
      alert('❌ ' + (d.error || 'فشل الحفظ'));
    }
  } catch (e) {
    alert('❌ خطأ في الحفظ');
  }
}

async function deleteSupportNumber(id) {
  if (!confirm('تأكيد حذف رقم الدعم الفني?')) return;
  const res = await apiDelete(`${API}/support-numbers/${id}`);
  if (res.ok) { alert('✅ تم الحذف'); loadPage('support-numbers'); }
  else alert('❌ فشل الحذف');
}

// ─── Toggle Sidebar ───
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
