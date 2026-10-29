import { Form, FormInputType, FormSection } from "src/shared/types/form/form";
import { Column } from "src/shared/types/table/table.type";
import { FilterConfig, FilterField } from "src/shared/types/filter/filter.type";

interface CmsFormOptions {
  moreInputs?: FormInputType[];
  id?: string;
}

export default class CmsModel {
  constructor() {}

  public MODEL_NAME = "CorporateContent";

  // EVENTS CREATED
  public readonly EVENT_CREATED = "CMS_CREATED";
  public readonly EVENT_CREATED_SUSSCESS = "CMS_CREATED_SUSSCESS";
  public readonly EVENT_CREATED_FAILED = "CMS_CREATED_FAILED";

  // EVENTS UPDATED
  public readonly EVENT_UPDATED = "CMS_UPDATED";
  public readonly EVENT_UPDATED_SUCCESS = "CMS_UPDATED_SUCCESS";
  public readonly EVENT_UPDATED_FAILED = "CMS_UPDATED_FAILED";

  // EVENTS DELETED
  public readonly EVENT_DELETED = "CMS_DELETED";
  public readonly EVENT_DELETED_SUCCESS = "CMS_DELETED_SUCCESS";
  public readonly EVENT_DELETED_FAILED = "CMS_DELETED_FAILED";

  getFilters(query: any): FilterConfig {
    const fields: FilterField[] = [
      {
        type: "search",
        name: "q",
        placeholder: "form.placeholders.search_cms",
        value: query?.q || "",
        width: "flex-grow",
      },
    ];

    return { action: "/dashboard/cms", fields };
  }

  getFormCreate({ moreInputs }: CmsFormOptions = {}): Form {
    const dataSection: FormSection = {
      title: "form.section.cms_details",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        {
          controlType: "input",
          name: "key",
          label: "form.labels.cms_key",
          type: "text",
          required: true,
          placeholder: "form.placeholders.cms_key",
        },
        {
          controlType: "input",
          name: "title",
          label: "form.labels.cms_title",
          type: "text",
          required: true,
          placeholder: "form.placeholders.cms_title",
        },
        {
          controlType: "input",
          name: "description",
          label: "form.labels.cms_description",
          type: "text",
          required: false,
          placeholder: "form.placeholders.cms_description",
          gridSpan: 2,
        },
        {
          controlType: "textarea",
          name: "content",
          label: "form.labels.cms_content",
          type: "textarea",
          required: true,
          placeholder: "form.placeholders.cms_content",
          gridSpan: 2,
        },
      ],
    };

    const form: Form = {
      title: "form.title.create_cms",
      method: "POST",
      action: `/api/cms/create`,
      submitLabel: "common.button.create",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) {
      form.inputs.push(...moreInputs);
    }

    return form;
  }

  getFormUpdate({
    object,
    moreInputs,
    id,
  }: CmsFormOptions & { object: any }): Form {
    const dataSection: FormSection = {
      title: "form.section.cms_details",
      className: "grid grid-cols-1 md:grid-cols-2 gap-4",
      elements: [
        {
          value: object?.key || "",
          controlType: "input",
          name: "key",
          label: "form.labels.cms_key",
          type: "text",
          required: true,
          disabled: true, // Key cannot be edited once created
          placeholder: "form.placeholders.cms_key",
        },
        {
          value: object?.title || "",
          controlType: "input",
          name: "title",
          label: "form.labels.cms_title",
          type: "text",
          required: true,
          placeholder: "form.placeholders.cms_title",
        },
        {
          value: object?.description || "",
          controlType: "input",
          name: "description",
          label: "form.labels.cms_description",
          type: "text",
          required: false,
          placeholder: "form.placeholders.cms_description",
          gridSpan: 2,
        },
        {
          value: object?.content || "",
          controlType: "textarea",
          name: "content",
          label: "form.labels.cms_content",
          type: "textarea",
          required: true,
          placeholder: "form.placeholders.cms_content",
          gridSpan: 2,
        },
      ],
    };

    const form: Form = {
      title: "form.title.update_cms",
      method: "POST",
      action: `/api/cms/${id}/update`,
      submitLabel: "common.button.update",
      inputs: [dataSection],
    };

    if (moreInputs && moreInputs.length > 0) form.inputs.push(...moreInputs);
    return form;
  }

  getColumns(): Column[] {
    return [
      { field: "key", label: "common.cms.key" },
      { field: "title", label: "common.cms.title" },
      { field: "description", label: "common.cms.description" },
      { field: "createdAt", label: "form.labels.createdAt", formatter: "date" },
    ];
  }
}
