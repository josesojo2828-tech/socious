import { Column } from "src/shared/types/table/table.type";

export interface PermissionItem {
  key: string;
  label: string;
}

export interface PermissionGroup {
  entity: string;
  key: string;
  permissions: PermissionItem[];
}

export default class PermitModel {
  constructor() {}

  public MODEL_NAME = "Permit";

  get PermitStatus() {
    return ["ACTIVE", "SUSPENDED", "DELETED"];
  }

  // DASHBOARDS TABS PERMITS
  public readonly PERMIT_DASHBOARD = "PERMIT_DASHBOARD";
  public readonly PERMIT_CURRENT_DASHBOARD = "PERMIT_CURRENT_DASHBOARD";
  public readonly PERMIT_DASHBOARD_TAB_OVERVIEW =
    "PERMIT_DASHBOARD_TAB_OVERVIEW";
  public readonly PERMIT_DASHBOARD_TAB_ANALYTICS =
    "PERMIT_DASHBOARD_TAB_ANALYTICS";
  public readonly PERMIT_DASHBOARD_TAB_REPORTS = "PERMIT_DASHBOARD_TAB_REPORTS";
  public readonly PERMIT_DASHBOARD_TAB_ALERTS = "PERMIT_DASHBOARD_TAB_ALERTS";
  public readonly PERMIT_DASHBOARD_TAB_EXPORT = "PERMIT_DASHBOARD_TAB_EXPORT";
  public readonly PERMIT_DASHBOARD_TAB_SETTINGS =
    "PERMIT_DASHBOARD_TAB_SETTINGS";
  public readonly PERMIT_DASHBOARD_TAB_WEBSITE = "PERMIT_DASHBOARD_TAB_WEBSITE";

  // DASHBOARDS TABS LIST
  public readonly LIST_PERMIT_DASHBOARD = [
    this.PERMIT_DASHBOARD,
    this.PERMIT_CURRENT_DASHBOARD,
    this.PERMIT_DASHBOARD_TAB_OVERVIEW,
    this.PERMIT_DASHBOARD_TAB_ANALYTICS,
    this.PERMIT_DASHBOARD_TAB_REPORTS,
    this.PERMIT_DASHBOARD_TAB_ALERTS,
    this.PERMIT_DASHBOARD_TAB_EXPORT,
    this.PERMIT_DASHBOARD_TAB_SETTINGS,
    this.PERMIT_DASHBOARD_TAB_WEBSITE,
  ];

  public readonly PERMIT_PERMIT_LIST = "PERMIT_PERMIT_LIST";
  public readonly PERMIT_PERMIT_UNIQUE = "PERMIT_PERMIT_UNIQUE";
  public readonly PERMIT_PERMIT_CREATED = "PERMIT_PERMIT_CREATED";
  public readonly PERMIT_PERMIT_UPDATED = "PERMIT_PERMIT_UPDATED";
  public readonly PERMIT_PERMIT_DELETED = "PERMIT_PERMIT_DELETED";
  public readonly LIST_PERMIT_PERMIT = [
    this.PERMIT_PERMIT_LIST,
    this.PERMIT_PERMIT_UNIQUE,
    this.PERMIT_PERMIT_CREATED,
    this.PERMIT_PERMIT_UPDATED,
    this.PERMIT_PERMIT_DELETED,
  ];

  public readonly SUPERADMIN = "SUPERADMIN";
  public readonly ADMIN = "ADMIN";
  public readonly USER = "USER";
  public readonly PATIENT = "PATIENT";
  public readonly CLINIC = "CLINIC";


  public readonly GLOBAL_PROFILE_UPDATE = "GLOBAL_PROFILE_UPDATE";
  public readonly GLOBAL_DASHBOARD_ACCESS = "GLOBAL_DASHBOARD_ACCESS";

  public readonly MY_CURRENT_ACTION_CREATED = "MY_CURRENT_ACTION_CREATED";
  public readonly MY_CURRENT_ACTION_UPDATE = "MY_CURRENT_ACTION_UPDATE";
  public readonly MY_CURRENT_ACTION_LIST = "MY_CURRENT_ACTION_LIST";
  public readonly MY_CURRENT_ACTION_UNIQUE = "MY_CURRENT_ACTION_UNIQUE";
  public readonly MY_CURRENT_ACTION_DELETE = "MY_CURRENT_ACTION_DELETE";
  public readonly MY_CURRENT_ACTION_PAYMENT_METHOD =
    "MY_CURRENT_ACTION_PAYMENT_METHOD";
  public readonly MY_CURRENT_ACTION_WALLET = "MY_CURRENT_ACTION_WALLET";
  public readonly MY_CURRENT_ACTION_ADDRESS = "MY_CURRENT_ACTION_ADDRESS";
  public readonly MY_CURRENT_ACTION_TRANSACTION =
    "MY_CURRENT_ACTION_TRANSACTION";
  public readonly MY_CURRENT_ACTION_SUBSCRIPTION =
    "MY_CURRENT_ACTION_SUBSCRIPTION";
  public readonly MY_CURRENT_ACTION_NOTIFICATION =
    "MY_CURRENT_ACTION_NOTIFICATION";
  // ACTION FOR SECTIONS
  public readonly MY_CURRENT_ACTION_ADMINISTRATION =
    "MY_CURRENT_ACTION_ADMINISTRATION"; // payment-methods, subscriptions, wallets
  public readonly LIST_MY_CURRENT_ACTION = [
    this.MY_CURRENT_ACTION_CREATED,
    this.MY_CURRENT_ACTION_UPDATE,
    this.MY_CURRENT_ACTION_LIST,
    this.MY_CURRENT_ACTION_UNIQUE,
    this.MY_CURRENT_ACTION_DELETE,
    this.MY_CURRENT_ACTION_PAYMENT_METHOD,
    this.MY_CURRENT_ACTION_WALLET,
    this.MY_CURRENT_ACTION_ADDRESS,
    this.MY_CURRENT_ACTION_NOTIFICATION,
  ];

  public readonly USER_CREATED = "USER_CREATED";
  public readonly USER_UPDATE = "USER_UPDATE";
  public readonly USER_LIST = "USER_LIST";
  public readonly USER_UNIQUE = "USER_UNIQUE";
  public readonly USER_DELETE = "USER_DELETE";
  public readonly LIST_USER = [
    this.USER_CREATED,
    this.USER_UPDATE,
    this.USER_LIST,
    this.USER_UNIQUE,
    this.USER_DELETE,
  ];

  public readonly USER_WALLET_CREATED = "USER_WALLET_CREATED";
  public readonly USER_WALLET_UPDATE = "USER_WALLET_UPDATE";
  public readonly USER_WALLET_LIST = "USER_WALLET_LIST";
  public readonly USER_WALLET_UNIQUE = "USER_WALLET_UNIQUE";
  public readonly USER_WALLET_DELETE = "USER_WALLET_DELETE";
  public readonly LIST_USER_WALLET = [
    this.USER_WALLET_CREATED,
    this.USER_WALLET_UPDATE,
    this.USER_WALLET_LIST,
    this.USER_WALLET_UNIQUE,
    this.USER_WALLET_DELETE,
  ];

  public readonly USER_ADDRESS_CREATED = "USER_ADDRESS_CREATED";
  public readonly USER_ADDRESS_UPDATE = "USER_ADDRESS_UPDATE";
  public readonly USER_ADDRESS_LIST = "USER_ADDRESS_LIST";
  public readonly USER_ADDRESS_UNIQUE = "USER_ADDRESS_UNIQUE";
  public readonly USER_ADDRESS_DELETE = "USER_ADDRESS_DELETE";
  public readonly LIST_USER_ADDRESS = [
    this.USER_ADDRESS_CREATED,
    this.USER_ADDRESS_UPDATE,
    this.USER_ADDRESS_LIST,
    this.USER_ADDRESS_UNIQUE,
    this.USER_ADDRESS_DELETE,
  ];

  public readonly SUBSCRIPTION_PLAN_CREATED = "SUBSCRIPTION_PLAN_CREATED";
  public readonly SUBSCRIPTION_PLAN_UPDATE = "SUBSCRIPTION_PLAN_UPDATE";
  public readonly SUBSCRIPTION_PLAN_LIST = "SUBSCRIPTION_PLAN_LIST";
  public readonly SUBSCRIPTION_PLAN_UNIQUE = "SUBSCRIPTION_PLAN_UNIQUE";
  public readonly SUBSCRIPTION_PLAN_DELETE = "SUBSCRIPTION_PLAN_DELETE";
  public readonly LIST_SUBSCRIPTION_PLAN = [
    this.SUBSCRIPTION_PLAN_CREATED,
    this.SUBSCRIPTION_PLAN_UPDATE,
    this.SUBSCRIPTION_PLAN_LIST,
    this.SUBSCRIPTION_PLAN_UNIQUE,
    this.SUBSCRIPTION_PLAN_DELETE,
  ];

  public readonly SUBSCRIPTION_CREATED = "SUBSCRIPTION_CREATED";
  public readonly SUBSCRIPTION_UPDATE = "SUBSCRIPTION_UPDATE";
  public readonly SUBSCRIPTION_LIST = "SUBSCRIPTION_LIST";
  public readonly SUBSCRIPTION_UNIQUE = "SUBSCRIPTION_UNIQUE";
  public readonly SUBSCRIPTION_DELETE = "SUBSCRIPTION_DELETE";
  public readonly LIST_SUBSCRIPTION = [
    this.SUBSCRIPTION_CREATED,
    this.SUBSCRIPTION_UPDATE,
    this.SUBSCRIPTION_LIST,
    this.SUBSCRIPTION_UNIQUE,
    this.SUBSCRIPTION_DELETE,
  ];

  public readonly PAYMENT_METHOD_CREATED = "PAYMENT_METHOD_CREATED";
  public readonly PAYMENT_METHOD_UPDATE = "PAYMENT_METHOD_UPDATE";
  public readonly PAYMENT_METHOD_LIST = "PAYMENT_METHOD_LIST";
  public readonly PAYMENT_METHOD_UNIQUE = "PAYMENT_METHOD_UNIQUE";
  public readonly PAYMENT_METHOD_DELETE = "PAYMENT_METHOD_DELETE";
  public readonly LIST_PAYMENT_METHOD = [
    this.PAYMENT_METHOD_CREATED,
    this.PAYMENT_METHOD_UPDATE,
    this.PAYMENT_METHOD_LIST,
    this.PAYMENT_METHOD_UNIQUE,
    this.PAYMENT_METHOD_DELETE,
  ];

  public readonly CMS_CREATED = "CMS_CREATED";
  public readonly CMS_UPDATE = "CMS_UPDATE";
  public readonly CMS_LIST = "CMS_LIST";
  public readonly CMS_UNIQUE = "CMS_UNIQUE";
  public readonly CMS_DELETE = "CMS_DELETE";
  public readonly LIST_CMS = [
    this.CMS_CREATED,
    this.CMS_UPDATE,
    this.CMS_LIST,
    this.CMS_UNIQUE,
    this.CMS_DELETE,
  ];

  public readonly USER_PAYMENT_METHOD_CREATED = "USER_PAYMENT_METHOD_CREATED";
  public readonly USER_PAYMENT_METHOD_UPDATE = "USER_PAYMENT_METHOD_UPDATE";
  public readonly USER_PAYMENT_METHOD_LIST = "USER_PAYMENT_METHOD_LIST";
  public readonly USER_PAYMENT_METHOD_UNIQUE = "USER_PAYMENT_METHOD_UNIQUE";
  public readonly USER_PAYMENT_METHOD_DELETE = "USER_PAYMENT_METHOD_DELETE";
  public readonly LIST_USER_PAYMENT_METHOD = [
    this.USER_PAYMENT_METHOD_CREATED,
    this.USER_PAYMENT_METHOD_UPDATE,
    this.USER_PAYMENT_METHOD_LIST,
    this.USER_PAYMENT_METHOD_UNIQUE,
    this.USER_PAYMENT_METHOD_DELETE,
  ];

  public readonly TRANSACTION_CREATED = "TRANSACTION_CREATED";
  public readonly TRANSACTION_UPDATE = "TRANSACTION_UPDATE";
  public readonly TRANSACTION_LIST = "TRANSACTION_LIST";
  public readonly TRANSACTION_UNIQUE = "TRANSACTION_UNIQUE";
  public readonly TRANSACTION_DELETE = "TRANSACTION_DELETE";
  public readonly LIST_TRANSACTION = [
    this.TRANSACTION_CREATED,
    this.TRANSACTION_UPDATE,
    this.TRANSACTION_LIST,
    this.TRANSACTION_UNIQUE,
    this.TRANSACTION_DELETE,
  ];

  public readonly NOTIFICATION_CREATED = "NOTIFICATION_CREATED";
  public readonly NOTIFICATION_UPDATE = "NOTIFICATION_UPDATE";
  public readonly NOTIFICATION_LIST = "NOTIFICATION_LIST";
  public readonly NOTIFICATION_UNIQUE = "NOTIFICATION_UNIQUE";
  public readonly NOTIFICATION_DELETE = "NOTIFICATION_DELETE";
  public readonly LIST_NOTIFICATION = [
    this.NOTIFICATION_CREATED,
    this.NOTIFICATION_UPDATE,
    this.NOTIFICATION_LIST,
    this.NOTIFICATION_UNIQUE,
    this.NOTIFICATION_DELETE,
  ];

  public readonly FILE_CREATED = "FILE_CREATED";
  public readonly FILE_UPDATE = "FILE_UPDATE";
  public readonly FILE_LIST = "FILE_LIST";
  public readonly FILE_UNIQUE = "FILE_UNIQUE";
  public readonly FILE_DELETE = "FILE_DELETE";
  public readonly LIST_FILE = [
    this.FILE_CREATED,
    this.FILE_UPDATE,
    this.FILE_LIST,
    this.FILE_UNIQUE,
    this.FILE_DELETE,
  ];

  // ----- Analytics Permit ----- //
  public readonly ANALYTICS_USER = "ANALYTICS_USER";
  public readonly ANALYTICS_USER_CARDS = "ANALYTICS_USER_CARDS";
  public readonly ANALYTICS_USER_BY_STATUS = "ANALYTICS_USER_BY_STATUS";
  public readonly ANALYTICS_USER__BY_PERMIT = "ANALYTICS_USER__BY_PERMIT";
  public readonly ANALYTICS_USER_LAST_REGISTER = "ANALYTICS_USER_LAST_REGISTER";
  public readonly ANALYTICS_USER_LAST_SESSION = "ANALYTICS_USER_LAST_SESSION";

  public readonly ANALYTICS_WALLET_SUMMARY = "ANALYTICS_WALLET_SUMMARY";
  public readonly ANALYTICS_WALLET_TRANSACTIONS =
    "ANALYTICS_WALLET_TRANSACTIONS";
  public readonly ANALYTICS_WALLET_DEPOSITS = "ANALYTICS_WALLET_DEPOSITS";
  public readonly ANALYTICS_WALLET_WITHDRAWS = "ANALYTICS_WALLET_WITHDRAWS";

  public readonly ANALYTICS_SUBSCRIPTION_SUMMARY =
    "ANALYTICS_SUBSCRIPTION_SUMMARY";
  public readonly ANALYTICS_SUBSCRIPTION_FLOW = "ANALYTICS_SUBSCRIPTION_FLOW";

  // ----- Activity Permits ----- //
  public readonly ACTIVITY_FEED = "ACTIVITY_FEED";
  public readonly ACTIVITY_ANALYTICS = "ACTIVITY_ANALYTICS";
  public readonly ACTIVITY_USER_TAB = "ACTIVITY_USER_TAB";
  public readonly LIST_ACTIVITY = [
    this.ACTIVITY_FEED,
    this.ACTIVITY_ANALYTICS,
    this.ACTIVITY_USER_TAB,
  ];

  // ========== NUTRINGEST ========== //
  public readonly DIET_CREATED = "DIET_CREATED";
  public readonly DIET_UPDATE = "DIET_UPDATE";
  public readonly DIET_LIST = "DIET_LIST";
  public readonly DIET_LIST_OWN = "DIET_LIST_OWN";
  public readonly DIET_LIST_ALL = "DIET_LIST_ALL";
  public readonly DIET_UNIQUE = "DIET_UNIQUE";
  public readonly DIET_DELETE = "DIET_DELETE";
  public readonly LIST_DIET = [
    this.DIET_CREATED,
    this.DIET_UPDATE,
    this.DIET_LIST,
    this.DIET_UNIQUE,
    this.DIET_DELETE,
  ];

  public readonly CONSULTATION_CREATED = "CONSULTATION_CREATED";
  public readonly CONSULTATION_UPDATE = "CONSULTATION_UPDATE";
  public readonly CONSULTATION_LIST = "CONSULTATION_LIST";
  public readonly CONSULTATION_LIST_OWN = "CONSULTATION_LIST_OWN";
  public readonly CONSULTATION_LIST_ALL = "CONSULTATION_LIST_ALL";
  public readonly CONSULTATION_UNIQUE = "CONSULTATION_UNIQUE";
  public readonly CONSULTATION_DELETE = "CONSULTATION_DELETE";
  public readonly LIST_CONSULTATION = [
    this.CONSULTATION_CREATED,
    this.CONSULTATION_UPDATE,
    this.CONSULTATION_LIST,
    this.CONSULTATION_UNIQUE,
    this.CONSULTATION_DELETE,
  ];

  public readonly PATIENT_CREATED = "PATIENT_CREATED";
  public readonly PATIENT_UPDATE = "PATIENT_UPDATE";
  public readonly PATIENT_LIST = "PATIENT_LIST";
  public readonly PATIENT_LIST_OWN = "PATIENT_LIST_OWN";
  public readonly PATIENT_LIST_ALL = "PATIENT_LIST_ALL";
  public readonly PATIENT_UNIQUE = "PATIENT_UNIQUE";
  public readonly PATIENT_DELETE = "PATIENT_DELETE";
  public readonly LIST_PATIENT = [
    this.PATIENT_CREATED,
    this.PATIENT_UPDATE,
    this.PATIENT_LIST,
    this.PATIENT_UNIQUE,
    this.PATIENT_DELETE,
  ];

  public readonly UNIVERSITY_CREATED = "UNIVERSITY_CREATED";
  public readonly UNIVERSITY_LIST = "UNIVERSITY_LIST";
  public readonly UNIVERSITY_UNIQUE = "UNIVERSITY_UNIQUE";
  public readonly UNIVERSITY_UPDATED = "UNIVERSITY_UPDATED";
  public readonly UNIVERSITY_DELETED = "UNIVERSITY_DELETED";
  public readonly LIST_UNIVERSITY = [
    this.UNIVERSITY_CREATED,
    this.UNIVERSITY_LIST,
    this.UNIVERSITY_UNIQUE,
    this.UNIVERSITY_UPDATED,
    this.UNIVERSITY_DELETED,
  ];

  public readonly CAMPUS_LIST = "CAMPUS_LIST";
  public readonly CAMPUS_APPROVE = "CAMPUS_APPROVE";
  public readonly CAMPUS_REJECT = "CAMPUS_REJECT";
  public readonly LIST_CAMPUS = [
    this.CAMPUS_LIST,
    this.CAMPUS_APPROVE,
    this.CAMPUS_REJECT,
  ];

  public readonly FOOD_CREATED = "FOOD_CREATED";
  public readonly FOOD_UPDATE = "FOOD_UPDATE";
  public readonly FOOD_LIST = "FOOD_LIST";
  public readonly FOOD_LIST_OWN = "FOOD_LIST_OWN";
  public readonly FOOD_LIST_ALL = "FOOD_LIST_ALL";
  public readonly FOOD_UNIQUE = "FOOD_UNIQUE";
  public readonly FOOD_DELETE = "FOOD_DELETE";
  public readonly LIST_FOOD = [
    this.FOOD_CREATED,
    this.FOOD_UPDATE,
    this.FOOD_LIST,
    this.FOOD_UNIQUE,
    this.FOOD_DELETE,
  ];

  public readonly MENU_CREATED = "MENU_CREATED";
  public readonly MENU_UPDATE = "MENU_UPDATE";
  public readonly MENU_LIST = "MENU_LIST";
  public readonly MENU_LIST_OWN = "MENU_LIST_OWN";
  public readonly MENU_LIST_ALL = "MENU_LIST_ALL";
  public readonly MENU_UNIQUE = "MENU_UNIQUE";
  public readonly MENU_DELETE = "MENU_DELETE";
  public readonly LIST_MENU = [
    this.MENU_CREATED,
    this.MENU_UPDATE,
    this.MENU_LIST,
    this.MENU_UNIQUE,
    this.MENU_DELETE,
  ];

  public readonly EXCHANGE_LIST_CREATED = "EXCHANGE_LIST_CREATED";
  public readonly EXCHANGE_LIST_UPDATE = "EXCHANGE_LIST_UPDATE";
  public readonly EXCHANGE_LIST_LIST = "EXCHANGE_LIST_LIST";
  public readonly EXCHANGE_LIST_LIST_OWN = "EXCHANGE_LIST_LIST_OWN";
  public readonly EXCHANGE_LIST_LIST_ALL = "EXCHANGE_LIST_LIST_ALL";
  public readonly EXCHANGE_LIST_UNIQUE = "EXCHANGE_LIST_UNIQUE";
  public readonly EXCHANGE_LIST_DELETE = "EXCHANGE_LIST_DELETE";
  public readonly LIST_EXCHANGE_LIST = [
    this.EXCHANGE_LIST_CREATED,
    this.EXCHANGE_LIST_UPDATE,
    this.EXCHANGE_LIST_LIST,
    this.EXCHANGE_LIST_UNIQUE,
    this.EXCHANGE_LIST_DELETE,
  ];

  // COMMUNITY PREMIUM
  public readonly COMMUNITY_BROWSE = "COMMUNITY_BROWSE";
  public readonly COMMUNITY_IMPORT = "COMMUNITY_IMPORT";
  public readonly COMMUNITY_PUBLISH = "COMMUNITY_PUBLISH";

  // CONDIMENT
  public readonly CONDIMENT_LIST = "CONDIMENT_LIST";
  public readonly CONDIMENT_LIST_OWN = "CONDIMENT_LIST_OWN";
  public readonly CONDIMENT_LIST_ALL = "CONDIMENT_LIST_ALL";
  public readonly CONDIMENT_CREATED = "CONDIMENT_CREATED";
  public readonly CONDIMENT_UPDATE = "CONDIMENT_UPDATE";
  public readonly CONDIMENT_UNIQUE = "CONDIMENT_UNIQUE";
  public readonly CONDIMENT_DELETE = "CONDIMENT_DELETE";
  public readonly LIST_CONDIMENT = [
    this.CONDIMENT_CREATED,
    this.CONDIMENT_UPDATE,
    this.CONDIMENT_LIST,
    this.CONDIMENT_UNIQUE,
    this.CONDIMENT_DELETE,
  ];

  // ========== MARKETPLACE ========== //
  public readonly MARKET_PRODUCT_CREATED = "MARKET_PRODUCT_CREATED";
  public readonly MARKET_PRODUCT_UPDATE = "MARKET_PRODUCT_UPDATE";
  public readonly MARKET_PRODUCT_LIST_OWN = "MARKET_PRODUCT_LIST_OWN";
  public readonly MARKET_PRODUCT_LIST_ALL = "MARKET_PRODUCT_LIST_ALL";
  public readonly MARKET_PRODUCT_DELETE = "MARKET_PRODUCT_DELETE";
  public readonly MARKET_PRODUCT_PURCHASE = "MARKET_PRODUCT_PURCHASE";
  public readonly MARKET_PRODUCT_APPROVE = "MARKET_PRODUCT_APPROVE";

  public readonly MARKET_CATEGORY_LIST = "MARKET_CATEGORY_LIST";
  public readonly MARKET_CATEGORY_CREATED = "MARKET_CATEGORY_CREATED";
  public readonly MARKET_CATEGORY_UPDATE = "MARKET_CATEGORY_UPDATE";
  public readonly MARKET_CATEGORY_DELETE = "MARKET_CATEGORY_DELETE";

  public readonly MARKET_SALE_LIST_OWN = "MARKET_SALE_LIST_OWN";
  public readonly MARKET_SALE_LIST_ALL = "MARKET_SALE_LIST_ALL";
  public readonly MARKET_SALE_COMPLETE = "MARKET_SALE_COMPLETE";
  public readonly MARKET_SALE_REFUND = "MARKET_SALE_REFUND";

  public readonly MARKET_REVIEW_CREATE = "MARKET_REVIEW_CREATE";
  public readonly MARKET_REVIEW_RESPOND = "MARKET_REVIEW_RESPOND";

  public readonly MARKET_COMMISSION_CONFIG = "MARKET_COMMISSION_CONFIG";

  // Marketplace Admin
  public readonly MARKET_ADMIN_ACCESS = "MARKET_ADMIN_ACCESS";
  public readonly MARKET_ADMIN_CAMPAIGNS = "MARKET_ADMIN_CAMPAIGNS";
  public readonly MARKET_ADMIN_PAYMENTS = "MARKET_ADMIN_PAYMENTS";
  public readonly MARKET_ADMIN_SELLERS = "MARKET_ADMIN_SELLERS";

  public readonly LIST_MARKET_PRODUCT = [
    this.MARKET_PRODUCT_CREATED,
    this.MARKET_PRODUCT_UPDATE,
    this.MARKET_PRODUCT_LIST_OWN,
    this.MARKET_PRODUCT_LIST_ALL,
    this.MARKET_PRODUCT_DELETE,
    this.MARKET_PRODUCT_PURCHASE,
    this.MARKET_PRODUCT_APPROVE,
  ];

  public readonly LIST_MARKET_CATEGORY = [
    this.MARKET_CATEGORY_LIST,
    this.MARKET_CATEGORY_CREATED,
    this.MARKET_CATEGORY_UPDATE,
    this.MARKET_CATEGORY_DELETE,
  ];

  public readonly LIST_MARKET_SALE = [
    this.MARKET_SALE_LIST_OWN,
    this.MARKET_SALE_LIST_ALL,
    this.MARKET_SALE_COMPLETE,
    this.MARKET_SALE_REFUND,
  ];

  public readonly LIST_MARKET_ALL = [
    ...this.LIST_MARKET_PRODUCT,
    ...this.LIST_MARKET_CATEGORY,
    ...this.LIST_MARKET_SALE,
    this.MARKET_REVIEW_CREATE,
    this.MARKET_REVIEW_RESPOND,
    this.MARKET_COMMISSION_CONFIG,
    this.MARKET_ADMIN_ACCESS,
    this.MARKET_ADMIN_CAMPAIGNS,
    this.MARKET_ADMIN_PAYMENTS,
    this.MARKET_ADMIN_SELLERS,
  ];

  get PermitSuperAdmin() {
    return {
      name: this.SUPERADMIN,
      description: "Super Admin",
      list: [
        ...this.LIST_MY_CURRENT_ACTION,
        ...this.LIST_USER,
        ...this.LIST_USER_WALLET,
        ...this.LIST_USER_ADDRESS,
        ...this.LIST_SUBSCRIPTION_PLAN,
        ...this.LIST_SUBSCRIPTION,
        ...this.LIST_PAYMENT_METHOD,
        ...this.LIST_CMS,
        ...this.LIST_USER_PAYMENT_METHOD,
        ...this.LIST_TRANSACTION,
        ...this.LIST_FILE,
        ...this.LIST_PERMIT_PERMIT,
        ...this.LIST_PERMIT_DASHBOARD,
        ...this.LIST_NOTIFICATION,
        this.ANALYTICS_USER,
        this.ANALYTICS_USER_CARDS,
        this.ANALYTICS_USER_BY_STATUS,
        this.ANALYTICS_USER__BY_PERMIT,
        this.ANALYTICS_USER_LAST_SESSION,
        this.ANALYTICS_USER_LAST_REGISTER,
        this.ANALYTICS_WALLET_SUMMARY,
        this.ANALYTICS_WALLET_TRANSACTIONS,
        this.ANALYTICS_WALLET_DEPOSITS,
        this.ANALYTICS_WALLET_WITHDRAWS,
        this.ANALYTICS_SUBSCRIPTION_SUMMARY,
        this.ANALYTICS_SUBSCRIPTION_FLOW,

// Nutringest
        this.DIET_LIST_ALL,
        ...this.LIST_DIET.filter(p => p !== this.DIET_LIST), // Keep all except DIET_LIST (which is now OWN/ALL)
        this.PATIENT_LIST_ALL,
        this.PATIENT_CREATED,
        this.PATIENT_UPDATE,
        this.PATIENT_UNIQUE,
        this.PATIENT_DELETE,
        this.FOOD_LIST_ALL,
        this.FOOD_CREATED,
        this.FOOD_UPDATE,
        this.FOOD_UNIQUE,
        this.FOOD_DELETE,
        this.MENU_LIST_ALL,
        this.MENU_CREATED,
        this.MENU_UPDATE,
        this.MENU_UNIQUE,
        this.MENU_DELETE,
        this.EXCHANGE_LIST_LIST_ALL,
        this.EXCHANGE_LIST_CREATED,
        this.EXCHANGE_LIST_UPDATE,
        this.EXCHANGE_LIST_UNIQUE,
        this.EXCHANGE_LIST_DELETE,

        // Consultations
        this.CONSULTATION_LIST_ALL,
        this.CONSULTATION_CREATED,
        this.CONSULTATION_UPDATE,
        this.CONSULTATION_UNIQUE,
        this.CONSULTATION_DELETE,

        // Campus / Universities
        ...this.LIST_UNIVERSITY,
        ...this.LIST_CAMPUS,
        ...this.LIST_ACTIVITY,

        // Community Premium
        this.COMMUNITY_BROWSE,
        this.COMMUNITY_IMPORT,
        this.COMMUNITY_PUBLISH,

        // Condiment
        this.CONDIMENT_LIST_ALL,
        this.CONDIMENT_CREATED,
        this.CONDIMENT_UPDATE,
        this.CONDIMENT_UNIQUE,
        this.CONDIMENT_DELETE,

        // Marketplace
        ...this.LIST_MARKET_ALL,
      ],
    };
  }

  get PermitAdmin() {
    return {
      name: this.ADMIN,
      description: "Admin",
      list: [
        ...this.LIST_MY_CURRENT_ACTION,
        ...this.LIST_USER,
        ...this.LIST_USER_WALLET,
        ...this.LIST_USER_ADDRESS,
        ...this.LIST_SUBSCRIPTION,
        ...this.LIST_SUBSCRIPTION_PLAN,
        ...this.LIST_PAYMENT_METHOD,
        ...this.LIST_CMS,
        ...this.LIST_USER_PAYMENT_METHOD,
        ...this.LIST_TRANSACTION,
        ...this.LIST_FILE,
        ...this.LIST_PERMIT_DASHBOARD,
        ...this.LIST_NOTIFICATION,
        this.PERMIT_DASHBOARD_TAB_OVERVIEW,
        this.PERMIT_DASHBOARD_TAB_ANALYTICS,
        this.PERMIT_DASHBOARD_TAB_WEBSITE,
        ...this.LIST_CAMPUS,
        ...this.LIST_UNIVERSITY,

        // Nutringest - Admin can see ALL
        this.PATIENT_LIST_ALL,
        this.PATIENT_CREATED,
        this.PATIENT_UPDATE,
        this.PATIENT_UNIQUE,
        this.PATIENT_DELETE,
        this.DIET_LIST_ALL,
        this.DIET_CREATED,
        this.DIET_UPDATE,
        this.DIET_UNIQUE,
        this.DIET_DELETE,
        this.FOOD_LIST_ALL,
        this.FOOD_CREATED,
        this.FOOD_UPDATE,
        this.FOOD_UNIQUE,
        this.FOOD_DELETE,
        this.MENU_LIST_ALL,
        this.MENU_CREATED,
        this.MENU_UPDATE,
        this.MENU_UNIQUE,
        this.MENU_DELETE,
        this.EXCHANGE_LIST_LIST_ALL,
        this.EXCHANGE_LIST_CREATED,
        this.EXCHANGE_LIST_UPDATE,
        this.EXCHANGE_LIST_UNIQUE,
        this.EXCHANGE_LIST_DELETE,

        // Consultations - Admin can see ALL
        this.CONSULTATION_LIST_ALL,
        this.CONSULTATION_CREATED,
        this.CONSULTATION_UPDATE,
        this.CONSULTATION_UNIQUE,
        this.CONSULTATION_DELETE,

        // Community Premium
        this.COMMUNITY_BROWSE,
        this.COMMUNITY_IMPORT,
        this.COMMUNITY_PUBLISH,

        // Condiment
        this.CONDIMENT_LIST_ALL,
        this.CONDIMENT_CREATED,
        this.CONDIMENT_UPDATE,
        this.CONDIMENT_UNIQUE,
        this.CONDIMENT_DELETE,

        // Marketplace - Admin can manage all
        ...this.LIST_MARKET_ALL,
      ],
    };
  }

  get PermitUser() {
    return {
      name: this.USER,
      description: "User",
      list: [
        ...this.LIST_MY_CURRENT_ACTION,
        this.MY_CURRENT_ACTION_WALLET,
        this.MY_CURRENT_ACTION_ADDRESS,
        this.SUBSCRIPTION_PLAN_LIST,
        this.MY_CURRENT_ACTION_TRANSACTION,
        this.MY_CURRENT_ACTION_ADMINISTRATION,
        this.MY_CURRENT_ACTION_SUBSCRIPTION,
        this.MY_CURRENT_ACTION_PAYMENT_METHOD,

        this.DIET_CREATED,
        this.DIET_UPDATE,
        this.DIET_LIST_OWN,
        this.DIET_UNIQUE,
        this.PATIENT_CREATED,
        this.PATIENT_UPDATE,
        this.PATIENT_LIST_OWN,
        this.PATIENT_UNIQUE,
        this.FOOD_CREATED,
        this.FOOD_LIST_OWN,
        this.FOOD_UNIQUE,
        this.MENU_CREATED,
        this.MENU_UPDATE,
        this.MENU_LIST_OWN,
        this.MENU_UNIQUE,
        this.EXCHANGE_LIST_CREATED,
        this.EXCHANGE_LIST_LIST_OWN,
        this.EXCHANGE_LIST_UNIQUE,

        // Consultations - User can see OWN
        this.CONSULTATION_CREATED,
        this.CONSULTATION_UPDATE,
        this.CONSULTATION_LIST_OWN,
        this.CONSULTATION_UNIQUE,

        // Condiment - User can see OWN
        this.CONDIMENT_CREATED,
        this.CONDIMENT_LIST_OWN,
        this.CONDIMENT_UNIQUE,

        // Marketplace - User can create products and purchase
        this.MARKET_PRODUCT_CREATED,
        this.MARKET_PRODUCT_UPDATE,
        this.MARKET_PRODUCT_LIST_OWN,
        this.MARKET_PRODUCT_DELETE,
        this.MARKET_PRODUCT_PURCHASE,
        this.MARKET_CATEGORY_LIST,
        this.MARKET_SALE_LIST_OWN,
        this.MARKET_REVIEW_CREATE,
      ],
    };
  }

  get PermitPatient() {
    return {
      name: this.PATIENT,
      description: "Patient",
      list: [
        ...this.LIST_MY_CURRENT_ACTION,

        this.DIET_LIST_OWN,
        this.DIET_UNIQUE,
        this.MENU_LIST_OWN,
        this.MENU_UNIQUE,
        this.EXCHANGE_LIST_LIST_OWN,
        this.EXCHANGE_LIST_UNIQUE,

        // Consultations - Patient can see OWN
        this.CONSULTATION_LIST_OWN,
        this.CONSULTATION_UNIQUE,
      ],
    };
  }

  get PermitClinic() {
    return {
      name: this.CLINIC,
      description: "Clínica / Equipo Nutricional (Visualizador)",
      list: [
        this.GLOBAL_DASHBOARD_ACCESS,
        this.PERMIT_DASHBOARD,

        // Acciones sobre perfil propio
        this.MY_CURRENT_ACTION_LIST,
        this.MY_CURRENT_ACTION_UNIQUE,
        this.MY_CURRENT_ACTION_UPDATE,

        // Entidades de la Clínica (Modo Visualizador: Solo Lectura / Listado Global de Organización)
        this.PATIENT_LIST_ALL,
        this.PATIENT_UNIQUE,

        this.CONSULTATION_LIST_ALL,
        this.CONSULTATION_UNIQUE,

        this.DIET_LIST_ALL,
        this.DIET_UNIQUE,

        this.FOOD_LIST_ALL,
        this.FOOD_UNIQUE,

        this.MENU_LIST_ALL,
        this.MENU_UNIQUE,

        this.EXCHANGE_LIST_LIST_ALL,
        this.EXCHANGE_LIST_UNIQUE,

        this.CONDIMENT_LIST_ALL,
        this.CONDIMENT_UNIQUE,

        this.CAMPUS_LIST,
      ],
    };
  }


  getAllPermissionsGrouped(): PermissionGroup[] {
    return [
      {
        entity: "Dashboard",
        key: "DASHBOARD",
        permissions: [
          { key: this.PERMIT_DASHBOARD, label: "Acceso al Dashboard" },
          { key: this.PERMIT_CURRENT_DASHBOARD, label: "Dashboard Actual" },
          { key: this.PERMIT_DASHBOARD_TAB_OVERVIEW, label: "Tab Resumen" },
          { key: this.PERMIT_DASHBOARD_TAB_ANALYTICS, label: "Tab Analytics" },
          { key: this.PERMIT_DASHBOARD_TAB_REPORTS, label: "Tab Reportes" },
          { key: this.PERMIT_DASHBOARD_TAB_ALERTS, label: "Tab Alertas" },
          { key: this.PERMIT_DASHBOARD_TAB_EXPORT, label: "Tab Exportar" },
          { key: this.PERMIT_DASHBOARD_TAB_SETTINGS, label: "Tab Configuración" },
          { key: this.PERMIT_DASHBOARD_TAB_WEBSITE, label: "Tab Sitio Web" },
        ],
      },
      {
        entity: "Permisos",
        key: "PERMIT",
        permissions: [
          { key: this.PERMIT_PERMIT_LIST, label: "Listar roles" },
          { key: this.PERMIT_PERMIT_UNIQUE, label: "Ver detalle de rol" },
          { key: this.PERMIT_PERMIT_CREATED, label: "Crear roles" },
          { key: this.PERMIT_PERMIT_UPDATED, label: "Actualizar roles" },
          { key: this.PERMIT_PERMIT_DELETED, label: "Eliminar roles" },
        ],
      },
      {
        entity: "Mi Perfil",
        key: "MY_CURRENT_ACTION",
        permissions: [
          { key: this.MY_CURRENT_ACTION_CREATED, label: "Crear contenido propio" },
          { key: this.MY_CURRENT_ACTION_UPDATE, label: "Actualizar perfil propio" },
          { key: this.MY_CURRENT_ACTION_LIST, label: "Listar contenido propio" },
          { key: this.MY_CURRENT_ACTION_UNIQUE, label: "Ver detalle propio" },
          { key: this.MY_CURRENT_ACTION_DELETE, label: "Eliminar contenido propio" },
          { key: this.MY_CURRENT_ACTION_PAYMENT_METHOD, label: "Gestionar métodos de pago" },
          { key: this.MY_CURRENT_ACTION_WALLET, label: "Gestionar billetera" },
          { key: this.MY_CURRENT_ACTION_ADDRESS, label: "Gestionar direcciones" },
          { key: this.MY_CURRENT_ACTION_NOTIFICATION, label: "Gestionar notificaciones" },
        ],
      },
      {
        entity: "Usuarios",
        key: "USER",
        permissions: [
          { key: this.USER_CREATED, label: "Crear usuarios" },
          { key: this.USER_UPDATE, label: "Actualizar usuarios" },
          { key: this.USER_LIST, label: "Listar usuarios" },
          { key: this.USER_UNIQUE, label: "Ver detalle de usuario" },
          { key: this.USER_DELETE, label: "Eliminar usuarios" },
        ],
      },
      {
        entity: "Billeteras",
        key: "USER_WALLET",
        permissions: [
          { key: this.USER_WALLET_CREATED, label: "Crear billeteras" },
          { key: this.USER_WALLET_UPDATE, label: "Actualizar billeteras" },
          { key: this.USER_WALLET_LIST, label: "Listar billeteras" },
          { key: this.USER_WALLET_UNIQUE, label: "Ver detalle de billetera" },
          { key: this.USER_WALLET_DELETE, label: "Eliminar billeteras" },
        ],
      },
      {
        entity: "Direcciones",
        key: "USER_ADDRESS",
        permissions: [
          { key: this.USER_ADDRESS_CREATED, label: "Crear direcciones" },
          { key: this.USER_ADDRESS_UPDATE, label: "Actualizar direcciones" },
          { key: this.USER_ADDRESS_LIST, label: "Listar direcciones" },
          { key: this.USER_ADDRESS_UNIQUE, label: "Ver detalle de dirección" },
          { key: this.USER_ADDRESS_DELETE, label: "Eliminar direcciones" },
        ],
      },
      {
        entity: "Planes de Suscripción",
        key: "SUBSCRIPTION_PLAN",
        permissions: [
          { key: this.SUBSCRIPTION_PLAN_CREATED, label: "Crear planes" },
          { key: this.SUBSCRIPTION_PLAN_UPDATE, label: "Actualizar planes" },
          { key: this.SUBSCRIPTION_PLAN_LIST, label: "Listar planes" },
          { key: this.SUBSCRIPTION_PLAN_UNIQUE, label: "Ver detalle de plan" },
          { key: this.SUBSCRIPTION_PLAN_DELETE, label: "Eliminar planes" },
        ],
      },
      {
        entity: "Suscripciones",
        key: "SUBSCRIPTION",
        permissions: [
          { key: this.SUBSCRIPTION_CREATED, label: "Crear suscripciones" },
          { key: this.SUBSCRIPTION_UPDATE, label: "Actualizar suscripciones" },
          { key: this.SUBSCRIPTION_LIST, label: "Listar suscripciones" },
          { key: this.SUBSCRIPTION_UNIQUE, label: "Ver detalle de suscripción" },
          { key: this.SUBSCRIPTION_DELETE, label: "Eliminar suscripciones" },
        ],
      },
      {
        entity: "Métodos de Pago",
        key: "PAYMENT_METHOD",
        permissions: [
          { key: this.PAYMENT_METHOD_CREATED, label: "Crear métodos de pago" },
          { key: this.PAYMENT_METHOD_UPDATE, label: "Actualizar métodos de pago" },
          { key: this.PAYMENT_METHOD_LIST, label: "Listar métodos de pago" },
          { key: this.PAYMENT_METHOD_UNIQUE, label: "Ver detalle de método" },
          { key: this.PAYMENT_METHOD_DELETE, label: "Eliminar métodos de pago" },
        ],
      },
      {
        entity: "Métodos de Usuario",
        key: "USER_PAYMENT_METHOD",
        permissions: [
          { key: this.USER_PAYMENT_METHOD_CREATED, label: "Asignar método a usuario" },
          { key: this.USER_PAYMENT_METHOD_UPDATE, label: "Actualizar método de usuario" },
          { key: this.USER_PAYMENT_METHOD_LIST, label: "Listar métodos de usuario" },
          { key: this.USER_PAYMENT_METHOD_UNIQUE, label: "Ver detalle" },
          { key: this.USER_PAYMENT_METHOD_DELETE, label: "Eliminar método de usuario" },
        ],
      },
      {
        entity: "Transacciones",
        key: "TRANSACTION",
        permissions: [
          { key: this.TRANSACTION_CREATED, label: "Crear transacciones" },
          { key: this.TRANSACTION_UPDATE, label: "Actualizar transacciones" },
          { key: this.TRANSACTION_LIST, label: "Listar transacciones" },
          { key: this.TRANSACTION_UNIQUE, label: "Ver detalle de transacción" },
          { key: this.TRANSACTION_DELETE, label: "Eliminar transacciones" },
        ],
      },
      {
        entity: "Notificaciones",
        key: "NOTIFICATION",
        permissions: [
          { key: this.NOTIFICATION_CREATED, label: "Crear notificaciones" },
          { key: this.NOTIFICATION_UPDATE, label: "Actualizar notificaciones" },
          { key: this.NOTIFICATION_LIST, label: "Listar notificaciones" },
          { key: this.NOTIFICATION_UNIQUE, label: "Ver detalle de notificación" },
          { key: this.NOTIFICATION_DELETE, label: "Eliminar notificaciones" },
        ],
      },
      {
        entity: "Archivos",
        key: "FILE",
        permissions: [
          { key: this.FILE_CREATED, label: "Subir archivos" },
          { key: this.FILE_UPDATE, label: "Actualizar archivos" },
          { key: this.FILE_LIST, label: "Listar archivos" },
          { key: this.FILE_UNIQUE, label: "Ver detalle de archivo" },
          { key: this.FILE_DELETE, label: "Eliminar archivos" },
        ],
      },
      {
        entity: "Analíticas",
        key: "ANALYTICS",
        permissions: [
          { key: this.ANALYTICS_USER, label: "Analíticas de usuarios" },
          { key: this.ANALYTICS_USER_CARDS, label: "Tarjetas de usuarios" },
          { key: this.ANALYTICS_USER_BY_STATUS, label: "Usuarios por estado" },
          { key: this.ANALYTICS_USER__BY_PERMIT, label: "Usuarios por rol" },
          { key: this.ANALYTICS_USER_LAST_REGISTER, label: "Últimos registros" },
          { key: this.ANALYTICS_USER_LAST_SESSION, label: "Últimas sesiones" },
          { key: this.ANALYTICS_WALLET_SUMMARY, label: "Resumen de billeteras" },
          { key: this.ANALYTICS_WALLET_TRANSACTIONS, label: "Transacciones de billetera" },
          { key: this.ANALYTICS_WALLET_DEPOSITS, label: "Depósitos" },
          { key: this.ANALYTICS_WALLET_WITHDRAWS, label: "Retiros" },
          { key: this.ANALYTICS_SUBSCRIPTION_SUMMARY, label: "Resumen de suscripciones" },
          { key: this.ANALYTICS_SUBSCRIPTION_FLOW, label: "Flujo de suscripciones" },
        ],
      },
      {
        entity: "Actividad",
        key: "ACTIVITY",
        permissions: [
          { key: this.ACTIVITY_FEED, label: "Ver feed de actividad global" },
          { key: this.ACTIVITY_ANALYTICS, label: "Ver analíticas de actividad" },
          { key: this.ACTIVITY_USER_TAB, label: "Ver actividad de usuario" },
        ],
      },
      {
        entity: "Dietas",
        key: "DIET",
        permissions: [
          { key: this.DIET_CREATED, label: "Crear dietas" },
          { key: this.DIET_UPDATE, label: "Actualizar dietas" },
          { key: this.DIET_LIST_OWN, label: "Listar mis dietas" },
          { key: this.DIET_LIST_ALL, label: "Listar todas las dietas" },
          { key: this.DIET_UNIQUE, label: "Ver detalle de dieta" },
          { key: this.DIET_DELETE, label: "Eliminar dietas" },
        ],
      },
      {
        entity: "Pacientes",
        key: "PATIENT",
        permissions: [
          { key: this.PATIENT_CREATED, label: "Crear pacientes" },
          { key: this.PATIENT_UPDATE, label: "Actualizar pacientes" },
          { key: this.PATIENT_LIST_OWN, label: "Listar mis pacientes" },
          { key: this.PATIENT_LIST_ALL, label: "Listar todos los pacientes" },
          { key: this.PATIENT_UNIQUE, label: "Ver detalle de paciente" },
          { key: this.PATIENT_DELETE, label: "Eliminar pacientes" },
        ],
      },
      {
        entity: "Alimentos",
        key: "FOOD",
        permissions: [
          { key: this.FOOD_CREATED, label: "Crear alimentos" },
          { key: this.FOOD_UPDATE, label: "Actualizar alimentos" },
          { key: this.FOOD_LIST_OWN, label: "Listar mis alimentos" },
          { key: this.FOOD_LIST_ALL, label: "Listar todos los alimentos" },
          { key: this.FOOD_UNIQUE, label: "Ver detalle de alimento" },
          { key: this.FOOD_DELETE, label: "Eliminar alimentos" },
        ],
      },
      {
        entity: "Menús",
        key: "MENU",
        permissions: [
          { key: this.MENU_CREATED, label: "Crear menús" },
          { key: this.MENU_UPDATE, label: "Actualizar menús" },
          { key: this.MENU_LIST_OWN, label: "Listar mis menús" },
          { key: this.MENU_LIST_ALL, label: "Listar todos los menús" },
          { key: this.MENU_UNIQUE, label: "Ver detalle de menú" },
          { key: this.MENU_DELETE, label: "Eliminar menús" },
        ],
      },
      {
        entity: "Listas de Intercambio",
        key: "EXCHANGE_LIST",
        permissions: [
          { key: this.EXCHANGE_LIST_CREATED, label: "Crear listas" },
          { key: this.EXCHANGE_LIST_UPDATE, label: "Actualizar listas" },
          { key: this.EXCHANGE_LIST_LIST_OWN, label: "Listar mis listas" },
          { key: this.EXCHANGE_LIST_LIST_ALL, label: "Listar todas las listas" },
          { key: this.EXCHANGE_LIST_UNIQUE, label: "Ver detalle de lista" },
          { key: this.EXCHANGE_LIST_DELETE, label: "Eliminar listas" },
        ],
      },
      {
        entity: "Consultas",
        key: "CONSULTATION",
        permissions: [
          { key: this.CONSULTATION_CREATED, label: "Crear consultas" },
          { key: this.CONSULTATION_UPDATE, label: "Actualizar consultas" },
          { key: this.CONSULTATION_LIST_OWN, label: "Listar mis consultas" },
          { key: this.CONSULTATION_LIST_ALL, label: "Listar todas las consultas" },
          { key: this.CONSULTATION_UNIQUE, label: "Ver detalle de consulta" },
          { key: this.CONSULTATION_DELETE, label: "Eliminar consultas" },
        ],
      },
      {
        entity: "Condimentos",
        key: "CONDIMENT",
        permissions: [
          { key: this.CONDIMENT_CREATED, label: "Crear condimentos" },
          { key: this.CONDIMENT_UPDATE, label: "Actualizar condimentos" },
          { key: this.CONDIMENT_LIST_OWN, label: "Listar mis condimentos" },
          { key: this.CONDIMENT_LIST_ALL, label: "Listar todos los condimentos" },
          { key: this.CONDIMENT_UNIQUE, label: "Ver detalle de condimento" },
          { key: this.CONDIMENT_DELETE, label: "Eliminar condimentos" },
        ],
      },
      {
          entity: "Contenido Corporativo (CMS)",
          key: "CMS",
          permissions: [
            { key: this.CMS_CREATED, label: "Crear contenido" },
            { key: this.CMS_UPDATE, label: "Actualizar contenido" },
            { key: this.CMS_LIST, label: "Listar contenidos" },
            { key: this.CMS_UNIQUE, label: "Ver detalle de contenido" },
            { key: this.CMS_DELETE, label: "Eliminar contenido" },
          ],
        },
        {
          entity: "Universidades (Campus)",
          key: "UNIVERSITY",
          permissions: [
            { key: this.UNIVERSITY_CREATED, label: "Crear universidades" },
            { key: this.UNIVERSITY_LIST, label: "Listar universidades" },
            { key: this.UNIVERSITY_UNIQUE, label: "Ver detalle de universidad" },
            { key: this.UNIVERSITY_UPDATED, label: "Actualizar universidades" },
            { key: this.UNIVERSITY_DELETED, label: "Eliminar universidades" },
          ],
        },
        {
          entity: "Solicitudes de Campus (Estudiantes)",
          key: "CAMPUS",
          permissions: [
            { key: this.CAMPUS_LIST, label: "Listar solicitudes" },
            { key: this.CAMPUS_APPROVE, label: "Aprobar estudiantes" },
            { key: this.CAMPUS_REJECT, label: "Rechazar estudiantes" },
          ],
        },
        {
          entity: "Marketplace - Productos",
          key: "MARKET_PRODUCT",
          permissions: [
            { key: this.MARKET_PRODUCT_CREATED, label: "Crear productos" },
            { key: this.MARKET_PRODUCT_UPDATE, label: "Actualizar productos" },
            { key: this.MARKET_PRODUCT_LIST_OWN, label: "Listar mis productos" },
            { key: this.MARKET_PRODUCT_LIST_ALL, label: "Listar todos los productos" },
            { key: this.MARKET_PRODUCT_DELETE, label: "Eliminar productos" },
            { key: this.MARKET_PRODUCT_PURCHASE, label: "Comprar productos" },
            { key: this.MARKET_PRODUCT_APPROVE, label: "Aprobar productos" },
          ],
        },
        {
          entity: "Marketplace - Categorías",
          key: "MARKET_CATEGORY",
          permissions: [
            { key: this.MARKET_CATEGORY_LIST, label: "Listar categorías" },
            { key: this.MARKET_CATEGORY_CREATED, label: "Crear categorías" },
            { key: this.MARKET_CATEGORY_UPDATE, label: "Actualizar categorías" },
            { key: this.MARKET_CATEGORY_DELETE, label: "Eliminar categorías" },
          ],
        },
        {
          entity: "Marketplace - Ventas",
          key: "MARKET_SALE",
          permissions: [
            { key: this.MARKET_SALE_LIST_OWN, label: "Listar mis ventas" },
            { key: this.MARKET_SALE_LIST_ALL, label: "Listar todas las ventas" },
            { key: this.MARKET_SALE_COMPLETE, label: "Completar venta" },
            { key: this.MARKET_SALE_REFUND, label: "Reembolsar venta" },
          ],
        },
        {
          entity: "Marketplace - Reseñas",
          key: "MARKET_REVIEW",
          permissions: [
            { key: this.MARKET_REVIEW_CREATE, label: "Crear reseñas" },
            { key: this.MARKET_REVIEW_RESPOND, label: "Responder reseñas" },
          ],
        },
        {
          entity: "Marketplace - Configuración",
          key: "MARKET_CONFIG",
          permissions: [
            { key: this.MARKET_COMMISSION_CONFIG, label: "Configurar comisiones" },
          ],
        },
      ];
  }

  getColumns(): Column[] {
    return [
      { field: "name", label: "form.labels.name" },
      { field: "description", label: "form.labels.description" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
    ];
  }

  // EVENTS CREATED
  public readonly EVENT_CREATED = "PERMIT_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "PERMIT_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "PERMIT_CREATED_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "PERMIT_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "PERMIT_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "PERMIT_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "PERMIT_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "PERMIT_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "PERMIT_DELETED_FAILED";
}
