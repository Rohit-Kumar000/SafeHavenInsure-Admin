export const plans = [
  {
    id: 1, name: "Third Party", kind: "Base",
    description: "Mandatory legal cover for damage or injury caused to other people and their property.",
    includesTP: true, includesOD: false, rate: 0, active: true,
    features: ["Third-party injury or death liability", "Third-party property damage", "Meets Motor Vehicles Act requirement", "Owner-driver personal accident cover"],
  },
  {
    id: 2, name: "Comprehensive", kind: "Base",
    description: "Complete protection for your own vehicle plus third-party liability.",
    includesTP: true, includesOD: true, rate: 0, active: true,
    features: ["Everything in Third Party", "Own damage from accident, fire and theft", "Natural calamity cover (flood, storm, earthquake)", "No Claim Bonus on renewal"],
  },
  {
    id: 3, name: "Own Damage", kind: "Base",
    description: "Covers damage to your own vehicle for customers who already hold a third-party policy.",
    includesTP: false, includesOD: true, rate: 0, active: true,
    features: ["Own vehicle damage from accident, fire and theft", "Natural calamity cover", "No Claim Bonus on renewal"],
  },
  {
    id: 4, name: "Zero Depreciation", kind: "Add-on",
    description: "Full claim amount on replaced parts without depreciation deduction.",
    includesTP: false, includesOD: false, rate: 0.4, active: true,
    features: ["No depreciation on plastic, rubber and metal parts"],
  },
  {
    id: 5, name: "Engine Protect", kind: "Add-on",
    description: "Covers engine and gearbox damage from water ingression or oil leakage.",
    includesTP: false, includesOD: false, rate: 0.25, active: true,
    features: ["Engine and gearbox repair or replacement"],
  },
  {
    id: 6, name: "Roadside Assistance", kind: "Add-on",
    description: "24x7 help for breakdowns, flat tyres, towing and fuel delivery.",
    includesTP: false, includesOD: false, rate: 0.1, active: true,
    features: ["Towing", "Flat tyre and battery jump-start", "Emergency fuel delivery"],
  },
  {
    id: 7, name: "Return to Invoice", kind: "Add-on",
    description: "Get the full invoice value if the vehicle is stolen or declared a total loss.",
    includesTP: false, includesOD: false, rate: 0.3, active: true,
    features: ["Invoice value on total loss or theft"],
  },
  {
    id: 8, name: "Consumables Cover", kind: "Add-on",
    description: "Covers nuts, bolts, engine oil, coolant and other consumables used in repair.",
    includesTP: false, includesOD: false, rate: 0.15, active: true,
    features: ["Engine oil, coolant, nuts and bolts"],
  },
];