import { Form, FormSection } from "src/shared/types/form/form";
import { USER_WALLET_BASE_FIELDS } from "./wallet-form-fields";
import { Column } from "src/shared/types/table/table.type";
import { UserWallet } from "src/shared/types/schema.types";
import {
  FilterConfig,
  FilterField,
  UserWalletFilterOptions,
} from "src/shared/types/filter/filter.type";

export default class WalletModel {
  constructor() {}

  public MODEL_NAME = "Wallet";

  // STATUS
  public readonly STATUS_ACTIVE = "ACTIVE";
  public readonly STATUS_SUSPENDED = "SUSPENDED";
  public readonly STATUS_DELETED = "DELETED";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "WALLET_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "WALLET_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "WALLET_CREATED_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "WALLET_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "WALLET_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "WALLET_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "WALLET_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "WALLET_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "WALLET_DELETED_FAILED";

  // WALLET EVENTS
  public readonly EVENT_WALLET_BALANCE_UPDATED = "WALLET_BALANCE_UPDATED";
  public readonly EVENT_WALLET_BALANCE_UPDATED_SUCCESS =
    "WALLET_BALANCE_UPDATED_SUCCESS";
  public readonly EVENT_WALLET_BALANCE_UPDATED_FAILED =
    "WALLET_BALANCE_UPDATED_FAILED";
  public readonly EVENT_WALLET_INCREASE_BALANCE = "WALLET_INCREASE_BALANCE";
  public readonly EVENT_WALLET_INCREASE_BALANCE_SUCCESS =
    "WALLET_INCREASE_BALANCE_SUCCESS";
  public readonly EVENT_WALLET_INCREASE_BALANCE_FAILED =
    "WALLET_INCREASE_BALANCE_FAILED";
  public readonly EVENT_WALLET_DECREASE_BALANCE = "WALLET_DECREASE_BALANCE";
  public readonly EVENT_WALLET_DECREASE_BALANCE_SUCCESS =
    "WALLET_DECREASE_BALANCE_SUCCESS";
  public readonly EVENT_WALLET_DECREASE_BALANCE_FAILED =
    "WALLET_DECREASE_BALANCE_FAILED";

  // EVENTS STATUS
  public readonly EVENT_STATUS_SUSPEND = "WALLET_SUSPEND";
  public readonly EVENT_STATUS_UNSUSPEND = "WALLET_UNSUSPEND";

  getFilters({
    currencyOptions,
    query,
  }: UserWalletFilterOptions): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "Buscar por correo de usuario...",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    if (currencyOptions) {
      fields.push({
        type: "select",
        name: "currency",
        label: "Moneda",
        placeholder: "Todas",
        options: currencyOptions,
        value: query?.currency || "",
        width: "w-32",
      });
    }

    return { action: "/dashboard/wallets", fields };
  }

  getColumns(): Column[] {
    return [
      { field: "user.email", label: "form.labels.email", formatter: "email" },
      { field: "balance", label: "form.labels.balance" },
      { field: "currency", label: "form.labels.currency" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
    ];
  }

  getFormUpdateWallet({ object }: { object: UserWallet }): Form {
    return {
      title: "form.title.update_wallet",
      action: `/api/wallet/${object.id}/update`,
      method: "POST",
      submitLabel: "form.buttons.save",
      inputs: [
        {
          title: "form.labels.details",
          className: "grid grid-cols-1 gap-4",
          elements: [
            {
              controlType: "input",
              name: "balance",
              label: "form.labels.balance",
              type: "number",
              required: true,
              value: Number(object.balance),
              placeholder: "0.00",
            },
            {
              controlType: "input",
              name: "currency",
              label: "form.labels.currency",
              type: "text",
              required: true,
              value: object.currency,
              disabled: true,
            }
          ]
        }
      ]
    };
  }
}
