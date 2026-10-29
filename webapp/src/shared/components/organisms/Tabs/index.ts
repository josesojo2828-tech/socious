export * from './Tabs';
export * from './Tabs.types';

/*
    ## EXAMPLE:

    import { User, Settings, CreditCard } from 'lucide-react';

    const tabsData = [
      {
        label: 'Perfil',
        value: 'profile',
        icon: User,
        content: <ProfileForm />
      },
      {
        label: 'Cuenta',
        value: 'account',
        icon: Settings,
        content: <div>Configuración de cuenta...</div>
      },
      {
        label: 'Pagos',
        value: 'billing',
        icon: CreditCard,
        content: <BillingTable />,
        disabled: true // Próximamente
      }
    ];

    // Uso básico
    <Tabs items={tabsData} variant="bordered" />

    // Estilo "Lifted" (tipo carpeta)
    <Tabs items={tabsData} variant="lifted" />
*/