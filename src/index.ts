import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "m2a-field-selector",
  name: "M2A Field Selector",
  icon: "link",
  description: "Select items from collections with custom field output",
  component: InterfaceComponent,
  types: ["json", "alias"],
  group: "relational",
  localTypes: ["m2a"],
  options: [
    {
      field: "collections",
      name: "Collections",
      type: "json",
      meta: {
        width: "full",
        interface: "list",
        options: {
          template: "{{collection}} → {{outputField}}",
          fields: [
            {
              field: "collection",
              name: "Collection",
              type: "string",
              meta: {
                width: "half",
                interface: "system-collection",
                options: {
                  includeSystem: false,
                  allowNone: false
                }
              }
            },
            {
              field: "outputField",
              name: "Output Field",
              type: "string",
              meta: {
                width: "half",
                interface: "system-field",
                options: {
                  collectionField: "collection",
                  allowPrimaryKey: false
                }
              }
            }
          ]
        }
      }
    },
    {
      field: "displayMode",
      name: "Display Mode",
      type: "string",
      meta: {
        width: "half",
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Button", value: "button" },
            { text: "Draggable List", value: "drag" }
          ]
        },
        default: "button"
      }
    },
    {
      field: "outputFormat",
      name: "Output Format",
      type: "string",
      meta: {
        width: "half",
        interface: "select-dropdown",
        options: {
          choices: [
            { text: "Detailed (with collection and id)", value: "detailed" },
            { text: "Simple (values only)", value: "simple" },
            { text: "IDs only", value: "ids" }
          ]
        },
        default: "detailed"
      }
    },
    {
      field: "placeholder",
      name: "Placeholder",
      type: "string",
      meta: {
        width: "half",
        interface: "input",
        options: {
          placeholder: "Choose an item..."
        }
      }
    }
  ]
});
