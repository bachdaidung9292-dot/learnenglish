// =============================================
//  Service Worker — ListenUp PWA
// =============================================
var CACHE_NAME = 'listenup-v2'; // tăng version để buộc trình duyệt cập nhật service worker mới, xoá cache cũ
var ASSETS = [
  '/learnenglish/',
  '/learnenglish/index.html',
  '/learnenglish/app.js',
  '/learnenglish/auth.js',
  '/learnenglish/style.css',
  '/learnenglish/manifest.json'
];

// Cài đặt: cache các file tĩnh
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Kích hoạt: xoá cache cũ
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: dùng cache nếu offline, network nếu online
self.addEventListener('fetch', function(e) {
  // FIX: chỉ cache được request GET. Cache API của trình duyệt KHÔNG hỗ trợ
  // cache request POST/PUT/PATCH/DELETE — trước đây code cố cache mọi request,
  // kể cả các POST gửi tới PocketBase (đăng nhập, đăng ký, lưu dữ liệu...),
  // gây lỗi console: "Failed to execute 'put' on 'Cache': Request method 'POST'
  // is unsupported". Bỏ qua các request không phải GET để tránh lỗi này.
  if (e.request.method !== 'GET') {
    return;
  }
  // Không cache request đến Supabase API hoặc PocketBase API — đây là dữ liệu
  // động (tài khoản, bài học, tiến độ...), cache lại có thể khiến app hiển thị
  // dữ liệu cũ/sai giữa các thiết bị.
  if (e.request.url.includes('supabase.co') || e.request.url.includes('pocketbase-production-29d1.up.railway.app')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // Lưu bản copy mới vào cache
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch(function() {
        // Offline: dùng cache
        return caches.match(e.request);
      })
  );
});
