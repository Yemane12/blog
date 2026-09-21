/**
 * Shared browser auth helper (Supabase Auth).
 * Requires the Supabase JS UMD bundle to be loaded first (window.supabase).
 *
 * The URL and publishable ("anon") key are safe to expose in the browser —
 * Row Level Security is what actually protects the data.
 */
(function () {
  var SUPABASE_URL = 'https://zwlqdllbipakvynawhpx.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_wC-79guOTlheT9nbEtgKeA_1f4aLV5Z';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[auth] Supabase JS library not loaded.');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'blog-auth',
    },
  });

  window.blogAuth = {
    client: sb,

    async getSession() {
      var res = await sb.auth.getSession();
      return res.data ? res.data.session : null;
    },

    async getToken() {
      var session = await this.getSession();
      return session ? session.access_token : null;
    },

    /** fetch() that attaches the current access token as a Bearer header. */
    async authedFetch(path, options) {
      options = options || {};
      var token = await this.getToken();
      var headers = Object.assign({}, options.headers || {});
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(path, Object.assign({}, options, { headers: headers }));
    },

    signIn(email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password });
    },

    signUp(email, password, displayName) {
      return sb.auth.signUp({
        email: email,
        password: password,
        options: { data: { display_name: displayName || '' } },
      });
    },

    signOut() {
      return sb.auth.signOut();
    },
  };
})();
