export default {
  expo: {
    name: "LifeTape",
    slug: "lifetape",
    extra: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
};
