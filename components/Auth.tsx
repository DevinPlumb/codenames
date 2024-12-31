import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function AuthComponent() {
  const supabase = useSupabaseClient()

  return (
    <div className="w-full max-w-md p-6 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl shadow-lg">
      <Auth
        supabaseClient={supabase}
        appearance={{ 
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: 'rgb(16 185 129)', // emerald-500
                brandAccent: 'rgb(5 150 105)', // emerald-600
                brandButtonText: 'white',
                defaultButtonBackground: 'rgb(30 41 59)', // slate-800
                defaultButtonBackgroundHover: 'rgb(51 65 85)', // slate-700
              },
              borderWidths: {
                buttonBorderWidth: '1px',
                inputBorderWidth: '1px',
              },
              radii: {
                borderRadiusButton: '0.75rem',
                buttonBorderRadius: '0.75rem',
                inputBorderRadius: '0.75rem',
              },
              fonts: {
                bodyFontFamily: 'Chakra Petch, sans-serif',
                buttonFontFamily: 'Chakra Petch, sans-serif',
                inputFontFamily: 'Chakra Petch, sans-serif',
                labelFontFamily: 'Chakra Petch, sans-serif',
              },
            },
          },
          className: {
            container: 'font-sans tracking-wide',
            label: 'text-slate-400 font-medium',
            button: 'shadow-lg hover:scale-[1.02] transition-transform duration-200 font-medium',
            input: 'bg-slate-800/50 border-slate-700 font-medium',
            anchor: 'text-emerald-500 hover:text-emerald-400 font-medium',
            message: 'text-slate-400 font-medium',
            divider: 'text-slate-400'
          }
        }}
        providers={[]}
        magicLink={true}
      />
    </div>
  )
} 