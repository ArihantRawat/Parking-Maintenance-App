export type FieldType = "text" | "textarea" | "number" | "date" | "time" | "datetime" | "enum" | "boolean";

export type FilterType = "text" | "enum" | "date" | "number";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  table?: boolean;
  form?: boolean;
  editable?: boolean;
  required?: boolean;
  enumValues?: string[];
  filter?: FilterType;
  placeholder?: string;
  relation?: string;
  relationLabel?: string;
  optionsFrom?: "levels";
}

export interface ModuleDefinition {
  key: ModuleKey;
  tableName: string;
  route: string;
  label: string;
  singular: string;
  description: string;
  supportsStructure: boolean;
  statusField?: string;
  defaultSort: string;
  searchFields: string[];
  fields: FieldDefinition[];
}

export type ModuleKey =
  | "structures"
  | "parkingSpaces"
  | "parkingSpaceGroups"
  | "signs"
  | "signOrders"
  | "signOrderItems"
  | "equipment"
  | "maintenanceTickets"
  | "cleaningLogs"
  | "strippingLogs"
  | "inspections"
  | "purchases"
  | "reminders"
  | "attachments"
  | "activityEvents"
  | "vendors";

export type ApiRecord = Record<string, string | number | boolean | null | undefined>;

export interface ApiListResponse<T = ApiRecord> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSingleResponse<T = ApiRecord> {
  data: T;
}

export const statusValues = {
  structure: ["active", "inactive"],
  asset: ["active", "inactive", "under repair", "replaced", "retired"],
  sign: ["active", "damaged", "needs repair", "replaced", "retired", "missing"],
  order: ["ordered", "delivered", "installed", "cancelled"],
  ticket: ["open", "in progress", "completed", "cancelled"],
  scheduled: ["scheduled", "ongoing", "completed", "cancelled"],
  reminder: ["scheduled", "sending", "completed", "failed"],
  purchase: ["requested", "ordered", "delivered", "installed", "cancelled", "paid"],
  attachment: ["active", "archived"],
  event: ["open", "scheduled", "completed", "cancelled", "info"],
  vendor: ["active", "inactive"]
};

export const typeValues = {
  structureType: ["building", "garage", "lot"],
  space: ["None", "ADA", "Reserved", "Unreserved", "Carpool", "EV", "Other"],
  sign: ["None", "ADA", "Reserved", "Unreserved", "Carpool", "EV", "Directional", "Informational", "Warning", "Other"],
  condition: ["excellent", "good", "fair", "poor", "damaged", "needs repair"],
  priority: ["low", "medium", "high", "emergency"],
  cleaningCategory: ["spot cleaning", "annual/deep cleaning"],
  cleaningType: ["none", "sweeping", "pressure washing", "trash removal", "surface cleaning", "stain removal", "other"],
  strippingType: ["none", "roof stripping", "paint stripping", "line removal", "surface stripping", "elevator cleaning", "other"],
  frequency: ["Annual", "Quarterly", "Monthly"],
  reminderType: ["none", "cleaning", "stripping", "equipment", "sign replacement", "maintenance", "purchase", "general"],
  reminderEvent: ["none", "scheduled work", "completed work", "service due", "warranty expiry", "replacement due", "follow up", "general"],
  reminderFrequency: ["once", "daily", "weekly", "monthly", "quarterly", "annually"],
  purchaseItem: ["None", "Material", "Service", "Supply", "Other"],
  inspectionStatus: ["passed", "needs action", "failed", "follow-up required"],
  attachmentType: ["photo", "document", "invoice", "before photo", "after photo", "other"]
};

const timestamps: FieldDefinition[] = [
  { key: "created_at", label: "Created", type: "datetime", table: false, form: false },
  { key: "updated_at", label: "Updated", type: "datetime", table: false, form: false }
];

const structureField: FieldDefinition = {
  key: "structure_id",
  label: "Structure",
  type: "number",
  table: true,
  form: true,
  editable: true,
  required: true,
  filter: "enum",
  relation: "structures",
  relationLabel: "name"
};

const optionalStructureField: FieldDefinition = {
  ...structureField,
  required: false
};

export const moduleDefinitions: ModuleDefinition[] = [
  {
    key: "structures",
    tableName: "structures",
    route: "structures",
    label: "Structures",
    singular: "Structure",
    description: "Physical parking sites such as parking buildings, lots, or garages",
    supportsStructure: false,
    statusField: "status",
    defaultSort: "name",
    searchFields: ["name", "location", "type", "status"],
    fields: [
      { key: "name", label: "Name", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "location", label: "Location", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "type", label: "Type", type: "enum", table: true, form: true, editable: true, required: true, enumValues: typeValues.structureType, filter: "enum" },
      { key: "levels", label: "Levels/Floors", type: "text", table: true, form: true, editable: true, placeholder: "Example: P1, P2, Level 1, Roof" },
      { key: "description", label: "Description", type: "textarea", table: false, form: true, editable: true },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.structure, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true },
      ...timestamps
    ]
  },
  {
    key: "parkingSpaces",
    tableName: "parking_spaces",
    route: "parking-spaces",
    label: "Parking Spaces",
    singular: "Parking Space",
    description: "Named spaces or space groups within structures",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "space_number",
    searchFields: ["space_number", "label", "level", "type", "condition", "status"],
    fields: [
      structureField,
      { key: "space_number", label: "Name / Group Name", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "quantity", label: "Quantity", type: "number", table: true, form: true, editable: true, filter: "number" },
      { key: "group_id", label: "Group", type: "number", table: false, form: false, editable: false },
      { key: "label", label: "Display Label", type: "text", table: false, form: false, editable: false },
      { key: "level", label: "Level/Floor", type: "text", table: true, form: true, editable: true, filter: "text", optionsFrom: "levels" },
      { key: "area", label: "Area/Zone", type: "text", table: false, form: false, editable: false },
      { key: "type", label: "Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.space, filter: "enum" },
      { key: "condition", label: "Condition", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.condition, filter: "enum" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.asset, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true },
      ...timestamps
    ]
  },
  {
    key: "parkingSpaceGroups",
    tableName: "parking_space_groups",
    route: "parking-space-groups",
    label: "Space Groups",
    singular: "Space Group",
    description: "Logical groupings such as ADA banks, employee areas, EV rows, and visitor zones",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "name",
    searchFields: ["id", "name", "group_type", "level", "area", "status", "description", "notes"],
    fields: [
      structureField,
      { key: "name", label: "Name", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "group_type", label: "Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.space, filter: "enum" },
      { key: "level", label: "Level/Floor", type: "text", table: true, form: true, editable: true, filter: "text", optionsFrom: "levels" },
      { key: "area", label: "Area/Zone", type: "text", table: false, form: false, editable: false },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.asset, filter: "enum" },
      { key: "description", label: "Description", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "signs",
    tableName: "signs",
    route: "signs",
    label: "Signs",
    singular: "Sign",
    description: "Parking signage assigned to structures, spaces, and groups",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "id",
    searchFields: ["name", "sign_type", "message", "condition", "status", "level", "notes"],
    fields: [
      structureField,
      { key: "name", label: "Name", type: "text", table: true, form: true, editable: true },
      { key: "space_id", label: "Space / Group Name", type: "number", table: true, form: true, editable: true, filter: "enum", relation: "parkingSpaces", relationLabel: "space_number" },
      { key: "space_group_id", label: "Group", type: "number", table: false, form: false, editable: false },
      { key: "level", label: "Level/Floor", type: "text", table: true, form: true, editable: true, filter: "text", optionsFrom: "levels" },
      { key: "sign_type", label: "Type", type: "enum", table: true, form: false, editable: true, enumValues: typeValues.sign, filter: "enum" },
      { key: "message", label: "Message/Text", type: "textarea", table: true, form: true, editable: true, filter: "text" },
      { key: "condition", label: "Condition", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.condition, filter: "enum" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.sign, filter: "enum" },
      { key: "installation_date", label: "Installed", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "replacement_date", label: "Replacement Due", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: true, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "link_url", label: "Sign Link", type: "text", table: false, form: false, editable: true },
      { key: "media_url", label: "Picture/Video Link", type: "text", table: false, form: false, editable: true },
      { key: "cost", label: "Cost", type: "number", table: false, form: false, editable: false },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true },
      ...timestamps
    ]
  },
  {
    key: "signOrders",
    tableName: "sign_orders",
    route: "sign-orders",
    label: "Sign Orders",
    singular: "Sign Order",
    description: "Purchase and installation tracking for sign orders",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "id",
    searchFields: ["name", "sign_type", "condition", "status", "notes"],
    fields: [
      structureField,
      { key: "name", label: "Name", type: "text", table: true, form: true, editable: true },
      { key: "space_id", label: "Space / Group Name", type: "number", table: false, form: true, editable: true, filter: "enum", relation: "parkingSpaces", relationLabel: "space_number" },
      { key: "space_group_id", label: "Group", type: "number", table: false, form: false, editable: false },
      { key: "level", label: "Level/Floor", type: "text", table: true, form: true, editable: true, filter: "text", optionsFrom: "levels" },
      { key: "sign_type", label: "Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.sign, filter: "enum" },
      { key: "condition", label: "Condition", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.condition, filter: "enum" },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: true, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "supplier", label: "Supplier", type: "text", table: false, form: false, editable: false },
      { key: "quantity", label: "Quantity", type: "number", table: true, form: true, editable: true },
      { key: "cost", label: "Cost", type: "number", table: true, form: true, editable: true },
      { key: "purchase_date", label: "Ordered", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "delivery_date", label: "Delivered", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "installation_date", label: "Installed", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.order, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true },
      ...timestamps
    ]
  },
  {
    key: "signOrderItems",
    tableName: "sign_order_items",
    route: "sign-order-items",
    label: "Sign Order Items",
    singular: "Sign Order Item",
    description: "Line items for sign purchase orders",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "id",
    searchFields: ["id", "description", "status", "notes"],
    fields: [
      structureField,
      { key: "sign_order_id", label: "Order", type: "number", table: true, form: true, editable: true, required: true, filter: "number", relation: "signOrders" },
      { key: "sign_id", label: "Sign", type: "number", table: true, form: true, editable: true, filter: "number", relation: "signs" },
      { key: "description", label: "Description", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "quantity", label: "Quantity", type: "number", table: true, form: true, editable: true, filter: "number" },
      { key: "unit_cost", label: "Unit Cost", type: "number", table: true, form: true, editable: true },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.order, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "equipment",
    tableName: "equipment",
    route: "equipment",
    label: "Equipment",
    singular: "Equipment",
    description: "Equipment assets and replacement chains",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "name",
    searchFields: ["name", "level", "condition", "status", "notes"],
    fields: [
      structureField,
      { key: "previous_equipment_id", label: "Replaces", type: "number", table: false, form: false, editable: false, relation: "equipment" },
      { key: "name", label: "Name", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "type", label: "Type", type: "text", table: false, form: false, editable: false },
      { key: "level", label: "Level/Floor", type: "text", table: true, form: true, editable: true, filter: "text", optionsFrom: "levels" },
      { key: "area", label: "Area/Zone", type: "text", table: false, form: false, editable: false },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: true, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "vendor_name", label: "Vendor Name", type: "text", table: false, form: false, editable: false },
      { key: "purchase_date", label: "Purchased", type: "date", table: false, form: true, editable: true, filter: "date" },
      { key: "installation_date", label: "Installed", type: "date", table: false, form: false, editable: false },
      { key: "warranty_expiry", label: "Warranty Expiry", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "service_schedule", label: "Service Schedule", type: "text", table: false, form: false, editable: false },
      { key: "schedule_start_date", label: "Scheduled Start", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "schedule_end_date", label: "Scheduled End", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "cost", label: "Cost", type: "number", table: true, form: true, editable: true },
      { key: "condition", label: "Condition", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.condition, filter: "enum" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.asset, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true },
      ...timestamps
    ]
  },
  {
    key: "maintenanceTickets",
    tableName: "maintenance_tickets",
    route: "maintenance-tickets",
    label: "Maintenance Tickets",
    singular: "Maintenance Ticket",
    description: "Ticket-based maintenance for structures and assets",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "due_date",
    searchFields: ["id", "issue_type", "priority", "status", "assigned_to", "area", "notes"],
    fields: [
      structureField,
      { key: "space_id", label: "Space", type: "number", table: false, form: true, editable: true, filter: "number", relation: "parkingSpaces" },
      { key: "sign_id", label: "Sign", type: "number", table: false, form: true, editable: true, filter: "number", relation: "signs" },
      { key: "equipment_id", label: "Equipment", type: "number", table: false, form: true, editable: true, filter: "number", relation: "equipment" },
      { key: "area", label: "Area/Zone", type: "text", table: false, form: false, editable: false },
      { key: "issue_type", label: "Issue Type", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "priority", label: "Priority", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.priority, filter: "enum" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.ticket, filter: "enum" },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: false, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "assigned_to", label: "Assigned To", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "cost", label: "Cost", type: "number", table: true, form: true, editable: true },
      { key: "scheduled_date", label: "Scheduled", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "due_date", label: "Due", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "completed_date", label: "Completed", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "recurrence_rule", label: "Recurrence", type: "text", table: false, form: true, editable: true, filter: "text" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "cleaningLogs",
    tableName: "cleaning_logs",
    route: "cleaning-logs",
    label: "Cleaning Logs",
    singular: "Cleaning Log",
    description: "Spot and annual/deep cleaning activities",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "scheduled_date",
    searchFields: ["id", "cleaning_type", "category", "status", "assigned_to", "area", "notes"],
    fields: [
      structureField,
      { key: "space_id", label: "Space", type: "number", table: false, form: true, editable: true, filter: "number", relation: "parkingSpaces" },
      { key: "level", label: "Level/Floor", type: "text", table: true, form: true, editable: true, filter: "text", optionsFrom: "levels" },
      { key: "area", label: "Area/Zone", type: "text", table: false, form: false, editable: false },
      { key: "cleaning_scope", label: "Scope", type: "enum", table: false, form: false, editable: false, enumValues: ["space", "area", "full structure"] },
      { key: "cleaning_type", label: "Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.cleaningType, filter: "enum" },
      { key: "category", label: "Category", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.cleaningCategory, filter: "enum" },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: false, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "assigned_to", label: "Assigned To", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "cost", label: "Cost", type: "number", table: false, form: false, editable: false },
      { key: "scheduled_date", label: "Scheduled", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "completed_date", label: "Completed", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "frequency", label: "Frequency", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.frequency, filter: "enum" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.scheduled, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true },
      ...timestamps
    ]
  },
  {
    key: "strippingLogs",
    tableName: "stripping_logs",
    route: "stripping-logs",
    label: "Stripping Logs",
    singular: "Stripping Log",
    description: "Roof, paint, line removal, and surface stripping work",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "scheduled_date",
    searchFields: ["id", "stripping_type", "affected_area", "status", "notes"],
    fields: [
      structureField,
      { key: "area", label: "Area/Zone", type: "text", table: false, form: false, editable: false },
      { key: "stripping_type", label: "Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.strippingType, filter: "enum" },
      { key: "affected_area", label: "Affected Area", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: false, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "cost", label: "Cost", type: "number", table: true, form: true, editable: true },
      { key: "scheduled_date", label: "Scheduled", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "completed_date", label: "Completed", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.scheduled, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "inspections",
    tableName: "inspections",
    route: "inspections",
    label: "Inspections",
    singular: "Inspection",
    description: "Inspection records that can generate maintenance tickets",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "inspection_date",
    searchFields: ["id", "inspection_type", "inspector", "findings", "status", "recommended_action", "notes"],
    fields: [
      structureField,
      { key: "space_id", label: "Space", type: "number", table: false, form: true, editable: true, filter: "number", relation: "parkingSpaces" },
      { key: "sign_id", label: "Sign", type: "number", table: false, form: true, editable: true, filter: "number", relation: "signs" },
      { key: "equipment_id", label: "Equipment", type: "number", table: false, form: true, editable: true, filter: "number", relation: "equipment" },
      { key: "cleaning_log_id", label: "Cleaning Log", type: "number", table: false, form: true, editable: true, filter: "number", relation: "cleaningLogs" },
      { key: "stripping_log_id", label: "Stripping Log", type: "number", table: false, form: true, editable: true, filter: "number", relation: "strippingLogs" },
      { key: "inspection_type", label: "Type", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "inspector", label: "Inspector", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "inspection_date", label: "Date", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "findings", label: "Findings", type: "textarea", table: true, form: true, editable: true, filter: "text" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.inspectionStatus, filter: "enum" },
      { key: "recommended_action", label: "Recommended Action", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      { key: "generated_ticket_id", label: "Generated Ticket", type: "number", table: false, form: true, editable: true, filter: "number", relation: "maintenanceTickets" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "purchases",
    tableName: "purchases",
    route: "purchases",
    label: "Purchases",
    singular: "Purchase",
    description: "Track purchase requests, orders, deliveries, installations, and costs",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "purchase_date",
    searchFields: ["id", "entity_type", "item_type", "description", "status", "invoice_number", "notes"],
    fields: [
      optionalStructureField,
      { key: "entity_type", label: "Related Type", type: "enum", table: true, form: true, editable: true, enumValues: ["materials", "services", "supplies", "other"], filter: "enum" },
      { key: "entity_id", label: "Related ID", type: "number", table: false, form: false, editable: false },
      { key: "vendor_id", label: "Vendor Name", type: "number", table: true, form: true, editable: true, filter: "enum", relation: "vendors", relationLabel: "name" },
      { key: "item_type", label: "Item / Asset Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.purchaseItem, filter: "enum" },
      { key: "description", label: "Description", type: "textarea", table: true, form: true, editable: true, filter: "text" },
      { key: "cost", label: "Cost", type: "number", table: true, form: true, editable: true },
      { key: "purchase_date", label: "Purchased", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "delivery_date", label: "Delivered", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "installation_date", label: "Installed", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.purchase, filter: "enum" },
      { key: "invoice_number", label: "Invoice/Ref", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "reminders",
    tableName: "reminders",
    route: "reminders",
    label: "Scheduler",
    singular: "Scheduled Reminder",
    description: "Scheduled email reminders for maintenance work and follow-ups",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "reminder_date",
    searchFields: ["title", "message", "event_type", "reminder_type", "status", "frequency", "email_to", "notes"],
    fields: [
      optionalStructureField,
      { key: "title", label: "Event", type: "text", table: true, form: true, editable: true, required: true, filter: "text", placeholder: "Example: Quarterly sweeping follow-up" },
      { key: "message", label: "Message", type: "textarea", table: true, form: true, editable: true, filter: "text" },
      { key: "event_type", label: "Event Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.reminderEvent, filter: "enum" },
      { key: "reminder_type", label: "Reminder Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.reminderType, filter: "enum" },
      { key: "reminder_date", label: "Date", type: "date", table: true, form: true, editable: true, filter: "date" },
      { key: "reminder_time", label: "Time", type: "time", table: true, form: true, editable: true },
      { key: "frequency", label: "Frequency", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.reminderFrequency, filter: "enum" },
      { key: "email_to", label: "Email To", type: "text", table: true, form: true, editable: true, required: true, filter: "text", placeholder: "name@example.com" },
      { key: "status", label: "Email Status", type: "enum", table: true, form: false, editable: false, enumValues: statusValues.reminder, filter: "enum" },
      { key: "entity_type", label: "Linked Type", type: "enum", table: false, form: false, editable: false, enumValues: typeValues.reminderType, filter: "enum" },
      { key: "entity_id", label: "Linked Record", type: "number", table: false, form: false, editable: false },
      { key: "offset_days", label: "Offset Days", type: "number", table: false, form: false, editable: false },
      { key: "source", label: "Source", type: "text", table: false, form: false, editable: false },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "attachments",
    tableName: "attachments",
    route: "attachments",
    label: "Attachments",
    singular: "Attachment",
    description: "Local files, documents, photos, and before/after pairs",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "created_at",
    searchFields: ["id", "entity_type", "file_name", "file_path", "mime_type", "attachment_type", "before_after", "status", "notes"],
    fields: [
      optionalStructureField,
      { key: "entity_type", label: "Related Module", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "entity_id", label: "Related ID", type: "number", table: true, form: true, editable: true, filter: "number" },
      { key: "file_name", label: "File Name", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "file_path", label: "File Path", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "mime_type", label: "MIME Type", type: "text", table: false, form: true, editable: true, filter: "text" },
      { key: "attachment_type", label: "Type", type: "enum", table: true, form: true, editable: true, enumValues: typeValues.attachmentType, filter: "enum" },
      { key: "before_after", label: "Before/After", type: "enum", table: true, form: true, editable: true, enumValues: ["before", "after", "not applicable"], filter: "enum" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.attachment, filter: "enum" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      ...timestamps
    ]
  },
  {
    key: "activityEvents",
    tableName: "activity_events",
    route: "activity-events",
    label: "Activity Events",
    singular: "Activity Event",
    description: "Audit-friendly timeline entries across modules",
    supportsStructure: true,
    statusField: "status",
    defaultSort: "event_date",
    searchFields: ["id", "entity_type", "event_type", "title", "description", "status", "category", "actor"],
    fields: [
      structureField,
      { key: "entity_type", label: "Related Module", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "entity_id", label: "Related ID", type: "number", table: false, form: true, editable: true, filter: "number" },
      { key: "event_type", label: "Event Type", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "event_date", label: "Event Date", type: "datetime", table: true, form: true, editable: true, filter: "date" },
      { key: "title", label: "Title", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "description", label: "Description", type: "textarea", table: true, form: true, editable: true, filter: "text" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.event, filter: "enum" },
      { key: "category", label: "Category", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "actor", label: "Actor", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "created_at", label: "Created", type: "datetime", table: false, form: false }
    ]
  },
  {
    key: "vendors",
    tableName: "vendors",
    route: "vendors",
    label: "Vendors",
    singular: "Vendor",
    description: "Local vendor directory used by asset, service, and purchase records",
    supportsStructure: false,
    statusField: "status",
    defaultSort: "name",
    searchFields: ["id", "name", "contact_name", "email", "phone", "address", "notes", "status"],
    fields: [
      { key: "name", label: "Name", type: "text", table: true, form: true, editable: true, required: true, filter: "text" },
      { key: "contact_name", label: "Contact", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "email", label: "Email", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "phone", label: "Phone", type: "text", table: true, form: true, editable: true, filter: "text" },
      { key: "address", label: "Address", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      { key: "notes", label: "Notes", type: "textarea", table: false, form: true, editable: true, filter: "text" },
      { key: "status", label: "Status", type: "enum", table: true, form: true, editable: true, enumValues: statusValues.vendor, filter: "enum" },
      ...timestamps
    ]
  }
];

export const modulesByKey = Object.fromEntries(moduleDefinitions.map((module) => [module.key, module])) as Record<ModuleKey, ModuleDefinition>;
export const modulesByRoute = Object.fromEntries(moduleDefinitions.map((module) => [module.route, module])) as Record<string, ModuleDefinition>;

export const homeModuleKeys: ModuleKey[] = [
  "structures",
  "parkingSpaces",
  "signs",
  "signOrders",
  "equipment",
  "cleaningLogs",
  "strippingLogs",
  "purchases"
];

export const structureDashboardTabs = [
  { key: "overview", label: "Overview" },
  { key: "parking-spaces", label: "Parking Spaces" },
  { key: "signs", label: "Signs" },
  { key: "sign-orders", label: "Sign Orders" },
  { key: "equipment", label: "Equipment" },
  { key: "cleaning-logs", label: "Cleaning" },
  { key: "stripping-logs", label: "Stripping" },
  { key: "purchases", label: "Purchases" },
  { key: "reminders", label: "Scheduler" },
  { key: "timeline", label: "Activity Timeline" },
  { key: "reports", label: "Reports" }
];
