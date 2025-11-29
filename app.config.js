// app.config.js
export default ({ config }) => {
  return {
    ...config,
    expo: {
      ...(config.expo || {}),
      extra: {
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey:
          process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    },
  };
};
