import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import { DynamicRenderForm } from "@/shared/components/organisms/DynamicForm/DynamicRenderForm";
import { UserEndpoints } from "../../services/user.endpoints";

export const UserSecuritySection = () => {
  const {user} = useAuthStore();

  return (
    <div className="">
      <DynamicRenderForm cb={() => {}} path={UserEndpoints.form.password(`${user?.id}`)} />
    </div>
  )
}
