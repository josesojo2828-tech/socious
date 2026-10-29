import UserModel from "./user-model";
import UserAddressModel from "./user-address.model";
import UserPaymentMethodModel from "./user-payment-method.model";
import { User } from "src/shared/types/schema.types";

describe("User Models - API Route Prefixes", () => {
  const dummyUser: User = {
    id: "user-uuid-1234",
    email: "doctor@nutringest.com",
    username: "drnutri",
    firstName: "Doctor",
    lastName: "Nutri",
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  describe("UserModel", () => {
    let userModel: UserModel;

    beforeEach(() => {
      userModel = new UserModel();
    });

    it("getFormCreateUser action starts with /api/", () => {
      const form = userModel.getFormCreateUser({});
      expect(form.action).toBe("/api/user");
      expect(form.action.startsWith("/api/")).toBe(true);
    });

    it("getFormUpdateUser action starts with /api/", () => {
      const form = userModel.getFormUpdateUser({ object: dummyUser });
      expect(form.action).toBe(`/api/user/${dummyUser.id}/update`);
      expect(form.action.startsWith("/api/")).toBe(true);
    });

    it("getFormControlUser action starts with /api/", () => {
      const form = userModel.getFormControlUser({});
      expect(form.action).toBe("/api/user");
      expect(form.action.startsWith("/api/")).toBe(true);
    });

    it("getFormUpdatePassword action starts with /api/", () => {
      const form = userModel.getFormUpdatePassword({ object: dummyUser });
      expect(form.action).toBe(`/api/user/${dummyUser.id}/password`);
      expect(form.action.startsWith("/api/")).toBe(true);
    });
  });

  describe("UserAddressModel", () => {
    let addressModel: UserAddressModel;

    beforeEach(() => {
      addressModel = new UserAddressModel();
    });

    it("getFormCreate action starts with /api/", () => {
      const form = addressModel.getFormCreate({ userId: dummyUser.id });
      expect(form.action).toBe(`/api/user/address/${dummyUser.id}`);
      expect(form.action.startsWith("/api/")).toBe(true);
    });

    it("getFormUpdate action starts with /api/", () => {
      const form = addressModel.getFormUpdate({
        object: { id: "addr-123", userId: dummyUser.id } as any,
      });
      expect(form.action).toBe("/api/user/address/addr-123/update");
      expect(form.action.startsWith("/api/")).toBe(true);
    });
  });

  describe("UserPaymentMethodModel", () => {
    let paymentMethodModel: UserPaymentMethodModel;

    beforeEach(() => {
      paymentMethodModel = new UserPaymentMethodModel();
    });

    it("getFormCreate action starts with /api/", () => {
      const form = paymentMethodModel.getFormCreate({ userId: dummyUser.id });
      expect(form.action).toBe(`/api/user/payment-method/${dummyUser.id}`);
      expect(form.action.startsWith("/api/")).toBe(true);
    });
  });
});
