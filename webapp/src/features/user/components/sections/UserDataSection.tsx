import { DynamicRenderForm } from "@/shared/components/organisms/DynamicForm/DynamicRenderForm";
import { UserEndpoints } from "../../services/user.endpoints";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { User } from "lucide-react";

export const UserDataSection = () => {
  const { user, updateStorageUser } = useAuthStore();

  const SaveDataUser = (data: any) => {
    if (!user) return;
    let newUser = { ...user };
    newUser.firstName = data.firstName;
    newUser.lastName = data.lastName;
    newUser.username = data.username;
    newUser.email = data.email;
    updateStorageUser(newUser);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Datos Personales */}
      <div className="bg-base-100 rounded-3xl p-6 sm:p-8 shadow-sm border border-base-300/80">
        <div className="flex items-center gap-3 border-b border-base-300 pb-4 mb-6">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-base-content">Datos Personales</h2>
            <p className="text-xs text-base-content/70">
              Edición de tu nombre, usuario y correo electrónico de cuenta
            </p>
          </div>
        </div>
        <DynamicRenderForm
          cb={SaveDataUser}
          path={UserEndpoints.form.update(`${user?.id}`)}
          pathSend={UserEndpoints.actions.update(String(user?.id))}
        />
      </div>
    </div>
  );
};
