import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Form,
  FormInput,
  FormSection,
  FormSelect,
} from "src/shared/types/form/form";
import PermitReporitory from "../permit/repository/permit.repository";
import { I18nService } from "src/shared/lang/i18n.service";
import { User } from "src/shared/types/schema.types";
import { FilterParamsDto } from "src/shared/types/server.type";
import { Actions } from "src/shared/types/dashboard.type";
import { UserService } from "../user/services/user.service";
import SubscriptionReporitory from "../user/repository/subscription.repository";
import UserPaymentMethodReporitory from "../user/repository/user-payment-method.repository";
import { WalletService } from "../wallet/wallet.service";
import { TransactionService } from "../transaction/transaction.service";
import { Logger } from "@nestjs/common";
const logger = new Logger("custom-personal.service");


@Injectable()
export class CustomPersonalService {
  constructor(
    // private readonly subscriptionRepository: SubscriptionReporitory,
    private eventEmitter: EventEmitter2,

    private readonly permitRepository: PermitReporitory,
    private readonly i18n: I18nService,

    private readonly userService: UserService,

    private readonly susbcriptionRepository: SubscriptionReporitory,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly paymentmethodUserRepository: UserPaymentMethodReporitory,
  ) { }

  async index({ userSession }: { userSession: User }) { }

  async wallet({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    if (!userSession.wallet)
      return { error: true, object: "wallet", message: "No tiene wallet" };
    const response = await this.walletService.findOneById(
      userSession.wallet.id,
    );
    return { object: response };
  }

  async transactions({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const response = await this.transactionService.pagination({
      query,
      userSession,
    });
    return response;
  }

  async address({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) { }

  async paymentMethod({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const response = await this.userService.getPagePaymentMethodList({
      query,
      sessionUser: userSession,
    });
    return response;
  }

  async subscription({
    query,
    userSession,
  }: {
    query: FilterParamsDto;
    userSession: User;
  }) {
    const sub = await this.susbcriptionRepository.findOne({
      where: { userId: userSession.id },
    });
    // const uniquePage = await this.subscriptionUserService.findOne({ userId: userSession.id });
    const response = await this.userService.getPageSubscription({
      param: { id: `${sub?.id}` },
      query,
    });
    return response;
  }

  async getActions(
    permitList: string[],
    form: { formCreate?: Form; formUpdate?: Form; formPassword?: Form },
    object: string,
  ) {
    const actions: Actions = {
      create: null,
      update: null,
      list: null,
      unique: null,
      delete: null,
      password: null,
    };

    if (permitList.includes(this.permitRepository.TRANSACTION_LIST))
      actions.list = {
        label: "common.actions.list",
        icon: "list",
        link: "/dashboard/subscription",
        action: "redirect",
      };
    if (permitList.includes(this.permitRepository.TRANSACTION_UNIQUE))
      actions.unique = {
        label: "common.actions.unique",
        icon: "list",
        link: "/dashboard/subscription/:id",
      };
    if (permitList.includes(this.permitRepository.TRANSACTION_CREATED))
      actions.create = {
        form: form.formCreate,
        key: "subscription-plan-create-key-modal",
        label: "common.actions.create",
        icon: "plus",
        link: "/subscription/form/create",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.TRANSACTION_UPDATE))
      actions.update = {
        form: form.formUpdate,
        key: "subscription-plan-update-key-modal",
        label: "common.actions.update",
        icon: "edit",
        link: "/subscription/form/update",
        action: "modal",
      };
    if (permitList.includes(this.permitRepository.TRANSACTION_DELETE))
      actions.delete = {
        label: "common.actions.delete",
        icon: "trash",
        link: "/subscription/:id/delete",
        action: "modal",
      };

    logger.debug(actions);

    return actions;
  }

  /**
   * Esta función recorre el objeto Form y traduce todas las claves.
   */
  public translateForm(form: Form, lang: string): Form {
    // Traduce los campos principales
    form.title = this.i18n.translate(form.title, lang);
    form.submitLabel = this.i18n.translate(
      form.submitLabel || "common.actions.save",
      lang,
    );

    // Traduce secciones (inputs)
    form.inputs.forEach((section: FormSection) => {
      section.title = this.i18n.translate(section.title, lang);

      section.elements.forEach((control: FormInput | FormSelect | any) => {
        control.label = this.i18n.translate(control.label, lang);

        if (control.placeholder) {
          control.placeholder = this.i18n.translate(control.placeholder, lang);
        }

        if (control.options && control.options.length > 0) {
          control.options.forEach((option) => {
            option.label = this.i18n.translate(option.label, lang);
          });
        }
      });
    });

    return form;
  }
}
