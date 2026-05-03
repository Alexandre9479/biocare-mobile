import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const SUPABASE_URL  = 'https://cwhaxjrzeficemedqiue.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aGF4anJ6ZWZpY2VtZWRxaXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTQ3MDgsImV4cCI6MjA5MzE5MDcwOH0.MAljdehv-f-s5raliubQe7fiLeg9yB3cCfLpwGYQxIM'

// Use SecureStore for session persistence on device (more secure than AsyncStorage)
const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
