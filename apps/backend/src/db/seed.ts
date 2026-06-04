import { pathToFileURL } from "node:url";
import { db, nowIso, transaction } from "./database.js";
import { migrate } from "./schema.js";

type Row = Record<string, string | number | null | undefined>;

const tablesInDeleteOrder = [
  "audit_log",
  "activity_events",
  "attachments",
  "reminders",
  "purchases",
  "inspections",
  "stripping_logs",
  "cleaning_logs",
  "maintenance_tickets",
  "equipment",
  "sign_order_items",
  "sign_orders",
  "signs",
  "parking_spaces",
  "parking_space_groups",
  "vendors",
  "app_settings",
  "structures"
];

function insert(table: string, row: Row) {
  const entries = Object.entries(row).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => key);
  const placeholders = columns.map((key) => `@${key}`);
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`);
  return Number(stmt.run(Object.fromEntries(entries)).lastInsertRowid);
}

function addEvent(structure_id: number, entity_type: string, entity_id: number, event_type: string, event_date: string, title: string, description: string, status = "info", category = entity_type) {
  insert("activity_events", {
    structure_id,
    entity_type,
    entity_id,
    event_type,
    event_date,
    title,
    description,
    status,
    category,
    actor: "seed data"
  });
}

function addAudit(structure_id: number, entity_type: string, entity_id: number, action: string, change_summary: string) {
  insert("audit_log", {
    structure_id,
    entity_type,
    entity_id,
    action,
    change_summary,
    actor: "seed data"
  });
}

export function seedDatabase(options: { reset?: boolean } = {}) {
  migrate();

  transaction(() => {
    if (options.reset) {
      for (const table of tablesInDeleteOrder) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN (" + tablesInDeleteOrder.map(() => "?").join(",") + ")").run(...tablesInDeleteOrder);
    }

    const vendorIds = {
      signs: insert("vendors", {
        name: "Metro Signworks",
        contact_name: "Dana Lee",
        email: "orders@metrosignworks.local",
        phone: "555-0101",
        address: "102 Industrial Way",
        status: "active",
        notes: "Primary parking sign vendor."
      }),
      cleaning: insert("vendors", {
        name: "BrightDeck Cleaning",
        contact_name: "Marco Ruiz",
        email: "dispatch@brightdeck.local",
        phone: "555-0184",
        address: "44 Service Loop",
        status: "active",
        notes: "Sweeping and annual pressure washing."
      }),
      maintenance: insert("vendors", {
        name: "Garage Systems Service",
        contact_name: "Priya Shah",
        email: "service@gss.local",
        phone: "555-0177",
        address: "19 Liftgate Dr",
        status: "active",
        notes: "Gate arms, lighting, striping coordination."
      })
    };

    const structures = [
      {
        name: "Civic Center Garage",
        location: "100 Main Street",
        levels: "1, 2, 3, 4, 5",
        description: "Five-level municipal parking garage serving city offices.",
        notes: "Priority site for council meeting nights."
      },
      {
        name: "North Campus Lot",
        location: "455 College Avenue",
        levels: "Surface",
        description: "Surface lot and EV charging area for north campus.",
        notes: "Snow-route access must remain clear."
      },
      {
        name: "Harbor Point Structure",
        location: "88 Marina Boulevard",
        levels: "P1, P2, Roof",
        description: "Mixed visitor and employee structure near waterfront offices.",
        notes: "Salt air increases sign and equipment corrosion risk."
      }
    ].map((structure) =>
      insert("structures", {
        ...structure,
        status: "active"
      })
    );

    const [civic, campus, harbor] = structures;

    const groupIds = {
      civicAda: insert("parking_space_groups", {
        structure_id: civic,
        name: "Level 1 ADA Row",
        group_type: "ADA",
        level: "1",
        area: "South entry",
        status: "active",
        description: "Accessible stalls near elevator lobby.",
        notes: "Keep signage clear of column C1."
      }),
      civicReserved: insert("parking_space_groups", {
        structure_id: civic,
        name: "Council Reserved Bank",
        group_type: "reserved",
        level: "2",
        area: "East ramp",
        status: "active",
        description: "Reserved stalls used during meetings.",
        notes: "Temporary cones stored in maintenance room."
      }),
      campusEv: insert("parking_space_groups", {
        structure_id: campus,
        name: "EV Charging Row",
        group_type: "EV",
        level: "Surface",
        area: "North fence",
        status: "active",
        description: "Dual-port chargers and adjacent EV stalls.",
        notes: "Monitor cable wear."
      }),
      harborVisitor: insert("parking_space_groups", {
        structure_id: harbor,
        name: "Visitor Waterfront Row",
        group_type: "visitor",
        level: "P1",
        area: "West bay",
        status: "active",
        description: "Visitor stalls closest to lobby.",
        notes: "High turnover on weekdays."
      })
    };

    const spaceIds: number[] = [];
    for (let index = 1; index <= 14; index += 1) {
      spaceIds.push(
        insert("parking_spaces", {
          structure_id: civic,
          group_id: index <= 4 ? groupIds.civicAda : groupIds.civicReserved,
          space_number: `C-${String(index).padStart(3, "0")}`,
          label: index <= 4 ? `ADA ${index}` : `Reserved ${index - 4}`,
          level: index <= 4 ? "1" : "2",
          area: index <= 4 ? "South entry" : "East ramp",
          type: index <= 4 ? "ADA" : "reserved",
          condition: index === 8 ? "fair" : "good",
          status: "active",
          notes: index === 8 ? "Paint fading at stall boundary." : null
        })
      );
    }
    for (let index = 1; index <= 10; index += 1) {
      spaceIds.push(
        insert("parking_spaces", {
          structure_id: campus,
          group_id: groupIds.campusEv,
          space_number: `N-EV-${String(index).padStart(2, "0")}`,
          label: `EV ${index}`,
          level: "Surface",
          area: "North fence",
          type: "EV",
          condition: index === 2 ? "needs repair" : "good",
          status: index === 2 ? "under repair" : "active",
          notes: index === 2 ? "Charging cable holster cracked." : null
        })
      );
    }
    for (let index = 1; index <= 12; index += 1) {
      spaceIds.push(
        insert("parking_spaces", {
          structure_id: harbor,
          group_id: groupIds.harborVisitor,
          space_number: `H-P1-${String(index).padStart(2, "0")}`,
          label: `Visitor ${index}`,
          level: "P1",
          area: "West bay",
          type: "visitor",
          condition: index === 6 ? "damaged" : "good",
          status: "active",
          notes: index === 6 ? "Wheel stop loose." : null
        })
      );
    }

    const civicSign = insert("signs", {
      structure_id: civic,
      space_id: spaceIds[0],
      space_group_id: groupIds.civicAda,
      sign_type: "ADA reserved",
      message: "Accessible Parking Only",
      condition: "good",
      status: "active",
      installation_date: "2025-03-12",
      replacement_date: "2029-03-12",
      vendor_id: vendorIds.signs,
      cost: 185,
      notes: "Mounted on south wall."
    });
    const campusSign = insert("signs", {
      structure_id: campus,
      space_id: spaceIds[14],
      space_group_id: groupIds.campusEv,
      sign_type: "EV charging",
      message: "EV Charging Only - 4 Hour Limit",
      condition: "fair",
      status: "needs repair",
      installation_date: "2024-09-04",
      replacement_date: "2026-09-04",
      vendor_id: vendorIds.signs,
      cost: 220,
      notes: "Face is fading from sun exposure."
    });
    const harborSign = insert("signs", {
      structure_id: harbor,
      space_id: spaceIds[26],
      space_group_id: groupIds.harborVisitor,
      sign_type: "visitor",
      message: "Visitor Parking - Register at Lobby",
      condition: "poor",
      status: "damaged",
      installation_date: "2023-07-21",
      replacement_date: "2026-07-21",
      vendor_id: vendorIds.signs,
      cost: 165,
      notes: "Rust on lower bracket."
    });

    const civicOrder = insert("sign_orders", {
      structure_id: civic,
      sign_id: civicSign,
      vendor_id: vendorIds.signs,
      supplier: "Metro Signworks",
      quantity: 4,
      cost: 740,
      purchase_date: "2026-02-01",
      delivery_date: "2026-02-12",
      installation_date: "2026-02-18",
      status: "installed",
      notes: "ADA refresh order."
    });
    insert("sign_order_items", {
      structure_id: civic,
      sign_order_id: civicOrder,
      sign_id: civicSign,
      description: "Accessible parking wall sign",
      quantity: 4,
      unit_cost: 185,
      status: "installed",
      notes: "Installed with tamper-resistant anchors."
    });
    const campusOrder = insert("sign_orders", {
      structure_id: campus,
      sign_id: campusSign,
      vendor_id: vendorIds.signs,
      supplier: "Metro Signworks",
      quantity: 2,
      cost: 440,
      purchase_date: "2026-05-20",
      delivery_date: "2026-06-12",
      status: "ordered",
      notes: "Replace faded EV signs."
    });
    insert("sign_order_items", {
      structure_id: campus,
      sign_order_id: campusOrder,
      sign_id: campusSign,
      description: "EV time-limit sign",
      quantity: 2,
      unit_cost: 220,
      status: "ordered",
      notes: "Awaiting delivery."
    });

    const gateOld = insert("equipment", {
      structure_id: civic,
      name: "East Exit Gate Arm A",
      type: "gate arm",
      area: "East exit",
      vendor_id: vendorIds.maintenance,
      purchase_date: "2021-08-15",
      installation_date: "2021-09-01",
      warranty_expiry: "2024-09-01",
      service_schedule: "Quarterly",
      cost: 2800,
      condition: "poor",
      status: "replaced",
      notes: "Replaced after motor failures."
    });
    const gateNew = insert("equipment", {
      structure_id: civic,
      previous_equipment_id: gateOld,
      name: "East Exit Gate Arm B",
      type: "gate arm",
      area: "East exit",
      vendor_id: vendorIds.maintenance,
      purchase_date: "2026-01-20",
      installation_date: "2026-02-03",
      warranty_expiry: "2029-02-03",
      service_schedule: "Quarterly",
      cost: 3420,
      condition: "excellent",
      status: "active",
      notes: "Replacement chain links back to Gate Arm A."
    });
    const campusCharger = insert("equipment", {
      structure_id: campus,
      name: "EV Charger Dual Port 1",
      type: "EV charger",
      area: "North fence",
      vendor_id: vendorIds.maintenance,
      purchase_date: "2022-04-10",
      installation_date: "2022-05-05",
      warranty_expiry: "2026-05-05",
      service_schedule: "Semiannual",
      cost: 8200,
      condition: "needs repair",
      status: "under repair",
      notes: "Port B intermittent."
    });
    const harborPump = insert("equipment", {
      structure_id: harbor,
      name: "P1 Sump Pump",
      type: "drainage pump",
      area: "P1 mechanical",
      vendor_id: vendorIds.maintenance,
      purchase_date: "2023-01-18",
      installation_date: "2023-02-01",
      warranty_expiry: "2028-02-01",
      service_schedule: "Monthly wet test",
      cost: 4950,
      condition: "good",
      status: "active",
      notes: "Critical before storm season."
    });

    const ticket1 = insert("maintenance_tickets", {
      structure_id: civic,
      equipment_id: gateNew,
      area: "East exit",
      issue_type: "Gate arm sensor alignment",
      priority: "high",
      status: "open",
      vendor_id: vendorIds.maintenance,
      assigned_to: "Facilities Team",
      cost: 0,
      scheduled_date: "2026-06-07",
      due_date: "2026-06-10",
      recurrence_rule: "Quarterly inspection",
      notes: "Sensor intermittently fails in low morning light."
    });
    const ticket2 = insert("maintenance_tickets", {
      structure_id: campus,
      space_id: spaceIds[15],
      equipment_id: campusCharger,
      area: "North fence",
      issue_type: "EV charger holster replacement",
      priority: "medium",
      status: "in progress",
      vendor_id: vendorIds.maintenance,
      assigned_to: "Garage Systems Service",
      cost: 375,
      scheduled_date: "2026-06-03",
      due_date: "2026-06-05",
      notes: "Part received; install pending."
    });
    const ticket3 = insert("maintenance_tickets", {
      structure_id: harbor,
      space_id: spaceIds[31],
      area: "P1 West bay",
      issue_type: "Loose wheel stop",
      priority: "low",
      status: "completed",
      assigned_to: "Harbor onsite staff",
      cost: 95,
      scheduled_date: "2026-05-18",
      due_date: "2026-05-20",
      completed_date: "2026-05-19",
      notes: "Re-anchored and photographed."
    });

    const clean1 = insert("cleaning_logs", {
      structure_id: civic,
      area: "Level 1 elevator lobby",
      cleaning_scope: "area",
      cleaning_type: "pressure washing",
      category: "spot cleaning",
      vendor_id: vendorIds.cleaning,
      assigned_to: "BrightDeck Crew A",
      cost: 420,
      scheduled_date: "2026-06-06",
      frequency: "As needed",
      status: "scheduled",
      notes: "Oil stain near ADA spaces."
    });
    const clean2 = insert("cleaning_logs", {
      structure_id: campus,
      area: "Full lot",
      cleaning_scope: "full structure",
      cleaning_type: "sweeping",
      category: "annual/deep cleaning",
      vendor_id: vendorIds.cleaning,
      assigned_to: "BrightDeck Crew B",
      cost: 1800,
      scheduled_date: "2026-07-12",
      frequency: "Annual",
      status: "scheduled",
      notes: "Coordinate with summer closure."
    });
    const clean3 = insert("cleaning_logs", {
      structure_id: harbor,
      area: "P1 west bay",
      cleaning_scope: "area",
      cleaning_type: "trash removal",
      category: "spot cleaning",
      assigned_to: "Harbor onsite staff",
      cost: 0,
      scheduled_date: "2026-05-22",
      completed_date: "2026-05-22",
      frequency: "Weekly",
      status: "completed",
      notes: "Completed during morning patrol."
    });

    const strip1 = insert("stripping_logs", {
      structure_id: civic,
      area: "Level 2 east ramp",
      stripping_type: "line removal",
      affected_area: "Reserved bank C-005 through C-014",
      vendor_id: vendorIds.maintenance,
      cost: 950,
      scheduled_date: "2026-06-18",
      status: "scheduled",
      notes: "Remove old reserved striping before repaint."
    });
    const strip2 = insert("stripping_logs", {
      structure_id: campus,
      area: "North fence EV row",
      stripping_type: "surface stripping",
      affected_area: "EV charging row",
      vendor_id: vendorIds.maintenance,
      cost: 1250,
      scheduled_date: "2026-06-02",
      status: "ongoing",
      notes: "Surface prep in progress."
    });
    const strip3 = insert("stripping_logs", {
      structure_id: harbor,
      area: "P1 west bay",
      stripping_type: "paint stripping",
      affected_area: "Visitor arrows and stall legends",
      vendor_id: vendorIds.maintenance,
      cost: 780,
      scheduled_date: "2026-05-08",
      completed_date: "2026-05-09",
      status: "completed",
      notes: "Photos uploaded."
    });

    const inspection1 = insert("inspections", {
      structure_id: civic,
      equipment_id: gateNew,
      inspection_type: "Gate safety inspection",
      inspector: "R. Thompson",
      inspection_date: "2026-06-01",
      findings: "Sensor alignment drifts after repeated cycles.",
      status: "needs action",
      recommended_action: "Create maintenance ticket for sensor alignment.",
      generated_ticket_id: ticket1,
      notes: "Ticket generated from inspection."
    });
    const inspection2 = insert("inspections", {
      structure_id: campus,
      space_id: spaceIds[15],
      equipment_id: campusCharger,
      inspection_type: "EV equipment inspection",
      inspector: "M. Chen",
      inspection_date: "2026-05-29",
      findings: "Holster cracked, port B cable strain visible.",
      status: "follow-up required",
      recommended_action: "Replace holster and review cable routing.",
      generated_ticket_id: ticket2,
      notes: "Customer reports intermittent charging."
    });
    const inspection3 = insert("inspections", {
      structure_id: harbor,
      stripping_log_id: strip3,
      inspection_type: "Post-stripping inspection",
      inspector: "L. Alvarez",
      inspection_date: "2026-05-10",
      findings: "Paint removal complete; surface ready for layout.",
      status: "passed",
      recommended_action: "Proceed with new visitor markings.",
      notes: "No ticket required."
    });

    const purchaseIds = [
      insert("purchases", {
        structure_id: civic,
        entity_type: "equipment",
        entity_id: gateNew,
        vendor_id: vendorIds.maintenance,
        item_type: "equipment",
        description: "Replacement east exit gate arm",
        cost: 3420,
        purchase_date: "2026-01-20",
        delivery_date: "2026-01-28",
        installation_date: "2026-02-03",
        quantity: 1,
        status: "installed",
        invoice_number: "GSS-260120",
        notes: "Capital replacement."
      }),
      insert("purchases", {
        structure_id: campus,
        entity_type: "sign_orders",
        entity_id: campusOrder,
        vendor_id: vendorIds.signs,
        item_type: "signs",
        description: "Replacement EV signs",
        cost: 440,
        purchase_date: "2026-05-20",
        quantity: 2,
        status: "ordered",
        invoice_number: "MSW-5518",
        notes: "Ordered with UV-resistant coating."
      }),
      insert("purchases", {
        structure_id: harbor,
        entity_type: "stripping_logs",
        entity_id: strip3,
        vendor_id: vendorIds.maintenance,
        item_type: "stripping service",
        description: "P1 visitor row paint stripping",
        cost: 780,
        purchase_date: "2026-05-01",
        delivery_date: "2026-05-09",
        quantity: 1,
        status: "paid",
        invoice_number: "GSS-260509",
        notes: "Completed and paid."
      })
    ];

    const reminders = [
      insert("reminders", {
        structure_id: civic,
        entity_type: "maintenance_tickets",
        entity_id: ticket1,
        title: "Gate sensor alignment due",
        reminder_date: "2026-06-09",
        offset_days: 1,
        status: "pending",
        source: "maintenance due date",
        notes: "Generated from high-priority ticket."
      }),
      insert("reminders", {
        structure_id: campus,
        entity_type: "equipment",
        entity_id: campusCharger,
        title: "EV charger warranty follow-up",
        reminder_date: "2026-05-28",
        offset_days: 7,
        status: "overdue",
        source: "warranty expiry",
        notes: "Review warranty coverage for port B."
      }),
      insert("reminders", {
        structure_id: harbor,
        entity_type: "equipment",
        entity_id: harborPump,
        title: "Monthly sump pump wet test",
        reminder_date: "2026-06-15",
        offset_days: 0,
        status: "pending",
        source: "manual",
        notes: "Storm season readiness."
      })
    ];

    const attachments = [
      insert("attachments", {
        structure_id: civic,
        entity_type: "maintenance_tickets",
        entity_id: ticket1,
        file_name: "gate-sensor-before.jpg",
        file_path: "storage/attachments/sample/gate-sensor-before.jpg",
        mime_type: "image/jpeg",
        attachment_type: "before photo",
        before_after: "before",
        status: "active",
        notes: "Placeholder local path for seed data."
      }),
      insert("attachments", {
        structure_id: campus,
        entity_type: "cleaning_logs",
        entity_id: clean2,
        file_name: "annual-sweep-scope.pdf",
        file_path: "storage/attachments/sample/annual-sweep-scope.pdf",
        mime_type: "application/pdf",
        attachment_type: "document",
        before_after: "not applicable",
        status: "active",
        notes: "Scope document placeholder."
      }),
      insert("attachments", {
        structure_id: harbor,
        entity_type: "stripping_logs",
        entity_id: strip3,
        file_name: "p1-west-after.jpg",
        file_path: "storage/attachments/sample/p1-west-after.jpg",
        mime_type: "image/jpeg",
        attachment_type: "after photo",
        before_after: "after",
        status: "active",
        notes: "Post-stripping photo placeholder."
      })
    ];

    const datedEvents: Array<[number, string, number, string, string, string, string, string, string]> = [
      [civic, "equipment", gateNew, "installed", "2026-02-03T09:30:00.000Z", "Gate Arm B installed", "Replacement gate arm installed at east exit.", "completed", "equipment"],
      [civic, "inspections", inspection1, "inspection", "2026-06-01T14:00:00.000Z", "Gate safety inspection completed", "Inspection recommended sensor alignment.", "open", "inspection"],
      [civic, "maintenance_tickets", ticket1, "ticket opened", "2026-06-01T15:00:00.000Z", "Gate sensor ticket opened", "High-priority maintenance ticket created from inspection.", "open", "maintenance"],
      [civic, "cleaning_logs", clean1, "scheduled", "2026-06-02T10:00:00.000Z", "Spot pressure washing scheduled", "Oil stain pressure washing scheduled near ADA row.", "scheduled", "cleaning"],
      [campus, "equipment", campusCharger, "warranty review", "2026-05-28T08:00:00.000Z", "EV charger warranty reminder overdue", "Warranty review reminder is overdue.", "open", "reminder"],
      [campus, "maintenance_tickets", ticket2, "ticket updated", "2026-06-03T16:00:00.000Z", "EV holster repair in progress", "Vendor received replacement part.", "open", "maintenance"],
      [campus, "stripping_logs", strip2, "started", "2026-06-02T07:30:00.000Z", "EV row surface stripping started", "Surface stripping is ongoing.", "scheduled", "stripping"],
      [harbor, "maintenance_tickets", ticket3, "completed", "2026-05-19T11:30:00.000Z", "Wheel stop repair completed", "Visitor space wheel stop re-anchored.", "completed", "maintenance"],
      [harbor, "stripping_logs", strip3, "completed", "2026-05-09T15:45:00.000Z", "P1 visitor paint stripping completed", "Surface ready for new visitor markings.", "completed", "stripping"]
    ];

    for (const [structureId, entityType, entityId, eventType, eventDate, title, description, status, category] of datedEvents) {
      addEvent(structureId, entityType, entityId, eventType, eventDate, title, description, status, category);
    }

    for (const structureId of structures) {
      addAudit(structureId, "structures", structureId, "seeded", "Created seeded structure and related records.");
    }
    for (const purchaseId of purchaseIds) {
      const purchase = db.prepare("SELECT structure_id FROM purchases WHERE id = ?").get(purchaseId) as { structure_id: number };
      addAudit(purchase.structure_id, "purchases", purchaseId, "seeded", "Created seeded purchase record.");
    }
    for (const reminderId of reminders) {
      const reminder = db.prepare("SELECT structure_id FROM reminders WHERE id = ?").get(reminderId) as { structure_id: number };
      addAudit(reminder.structure_id, "reminders", reminderId, "seeded", "Created seeded reminder record.");
    }
    for (const attachmentId of attachments) {
      const attachment = db.prepare("SELECT structure_id FROM attachments WHERE id = ?").get(attachmentId) as { structure_id: number };
      addAudit(attachment.structure_id, "attachments", attachmentId, "seeded", "Created seeded attachment record.");
    }

    insert("app_settings", {
      key: "smtp_enabled",
      value: "false",
      is_secret: 0,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  });
}

export function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM structures").get() as { count: number };
  if (count.count === 0) {
    seedDatabase();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase({ reset: true });
  const count = db.prepare("SELECT COUNT(*) AS count FROM structures").get() as { count: number };
  console.log(`Seeded database with ${count.count} structures.`);
}
