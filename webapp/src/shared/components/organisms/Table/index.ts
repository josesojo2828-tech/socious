export * from './Table';
export * from './Table.types';

/* ## EXAMPLE USAGE:

    interface User {
      id: string;
      name: string;
      role: string;
      status: 'active' | 'inactive';
    }

    const users: User[] = [...];

    <Table<User>
      data={users}
      keyExtractor={(user) => user.id}
      isLoading={false}
      emptyState={<EmptyState title="Sin usuarios" icon={UserX} />}
      columns={[
        { header: 'Nombre', accessorKey: 'name', className: 'font-bold' },
        { header: 'Rol', accessorKey: 'role' },
        { 
          header: 'Estado', 
          render: (user) => (
            <Badge variant={user.status === 'active' ? 'success' : 'error'}>
              {user.status}
            </Badge>
          )
        },
        {
          header: 'Acciones',
          className: 'text-right',
          render: (user) => <Button size="sm">Editar</Button>
        }
      ]}
    />
*/