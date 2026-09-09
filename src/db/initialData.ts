import { VenueTemplate, AreaTemplate, ItemTemplate, Department, UserProfile, AppSettings, DailyInspection, OperationalIssue, DailyTask, CriterionTemplate, ShiftNote, VenueDefinition, BlueprintTemplate } from '../types';

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-server', name: 'Server', color: '#3b82f6' },
  { id: 'dept-bar', name: 'Bar', color: '#8b5cf6' },
  { id: 'dept-kitchen', name: 'Kitchen', color: '#ef4444' },
  { id: 'dept-cashier', name: 'Cashier', color: '#f59e0b' },
  { id: 'dept-clean', name: 'Cleaning Service', color: '#10b981' },
  { id: 'dept-security', name: 'Security', color: '#64748b' }
];

export const DEFAULT_VENUES: VenueDefinition[] = [
  { 
    id: 'venue-lucky-cat', 
    name: 'LUCKY CAT', 
    code: 'LC', 
    icon: 'Disc', 
    isActive: true, 
    order: 1, 
    description: 'Billiards, VIP Pool Rooms, Bar & Lounge' 
  },
  { 
    id: 'venue-jpe-ktv', 
    name: 'JPE KTV', 
    code: 'JPE', 
    icon: 'Mic', 
    isActive: true, 
    order: 2, 
    description: '2nd & 3rd Floor KTV Rooms, Bar, Toilets' 
  },
  { 
    id: 'venue-ground-lobby', 
    name: 'GROUND LOBBY', 
    code: 'GL', 
    icon: 'Shield', 
    isActive: true, 
    order: 3, 
    description: 'Lobby Entrance, Security Desk, Public Areas' 
  }
];

// ==========================================
// REUSABLE CRITERIA BLUEPRINTS
// ==========================================

// 1. Lucky Cat Pool Table Criteria (Server responsibility)
export const LUCKY_CAT_POOL_TABLE_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-lc-pt-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DIRTY CLOTH', 'DUSTY', 'STAINS', 'LITTER / TRASH', 'OTHER']
  },
  {
    id: 'crit-lc-pt-ball',
    name: 'Ball',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['BALL MISSING', 'DIRTY / UNPOLISHED', 'CHIPPED BALL', 'OTHER']
  },
  {
    id: 'crit-lc-pt-table',
    name: 'Table',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['TABLE UNLEVEL', 'POCKET DAMAGED', 'CUSHION FAULTY', 'CLOTH TORN', 'OTHER']
  },
  {
    id: 'crit-lc-pt-chairs',
    name: 'Chairs / Sofa',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DIRTY SEATS', 'TORN UPHOLSTERY', 'BROKEN LEG', 'DISORDERLY', 'OTHER']
  },
  {
    id: 'crit-lc-pt-cue',
    name: 'Extension Cue',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING', 'DAMAGED / BENT', 'BRIDGE HEAD BROKEN', 'OTHER']
  },
  {
    id: 'crit-lc-pt-chalk',
    name: 'Chalk',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['NO CHALK', 'LOW CHALK', 'POWDER MESS', 'OTHER']
  },
  {
    id: 'crit-lc-pt-rack',
    name: 'Rack Paper',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING', 'TORN', 'LOW STOCK', 'OTHER']
  },
  {
    id: 'crit-lc-pt-tri',
    name: 'Triangle',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING', 'CRACKED / BROKEN', 'DIRTY', 'OTHER']
  },
  {
    id: 'crit-lc-pt-light',
    name: 'Overhead Lamp',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['LIGHT OFF', 'BULB BLOWN', 'FLICKERING', 'CROOKED HANGING', 'OTHER']
  }
];

// 2. Lucky Cat VIP Pool Room Criteria (Server responsibility)
export const LUCKY_CAT_VIP_POOL_ROOM_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-lc-vip-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DIRTY FLOOR', 'DUST', 'STAINS', 'ODOR', 'OTHER']
  },
  {
    id: 'crit-lc-vip-ball',
    name: 'Ball',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['BALL MISSING', 'DIRTY / UNPOLISHED', 'CHIPPED BALL', 'OTHER']
  },
  {
    id: 'crit-lc-vip-table',
    name: 'Table',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['UNLEVEL', 'CLOTH TORN', 'POCKET DAMAGED', 'CUSHION FAULTY', 'OTHER']
  },
  {
    id: 'crit-lc-vip-chairs',
    name: 'Chairs / Sofa',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DIRTY SEATS', 'TORN FABRIC', 'BROKEN FRAME', 'DISORDERLY', 'OTHER']
  },
  {
    id: 'crit-lc-vip-cue',
    name: 'Extension Cue',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING', 'DAMAGED', 'BRIDGE HEAD LOOSE', 'OTHER']
  },
  {
    id: 'crit-lc-vip-chalk',
    name: 'Chalk',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['NO CHALK', 'LOW CHALK', 'OTHER']
  },
  {
    id: 'crit-lc-vip-rack',
    name: 'Rack Paper',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING', 'TORN', 'LOW STOCK', 'OTHER']
  },
  {
    id: 'crit-lc-vip-tri',
    name: 'Triangle',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING', 'CRACKED', 'DIRTY', 'OTHER']
  },
  {
    id: 'crit-lc-vip-light',
    name: 'Overhead Lamp',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['LIGHT OFF', 'BULB BLOWN', 'FLICKERING', 'OTHER']
  },
  {
    id: 'crit-lc-vip-amb',
    name: 'Ambient Lamp',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['LIGHT OFF', 'DIM', 'BULB BLOWN', 'SWITCH FAULTY', 'OTHER']
  },
  {
    id: 'crit-lc-vip-exh',
    name: 'Exhaust',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['EXHAUST OFF', 'NOISY FAN', 'NOT EXTRACTING SMOKE', 'OTHER']
  },
  {
    id: 'crit-lc-vip-tv',
    name: 'TV',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['NO SIGNAL', 'TV OFF', 'REMOTE MISSING / BATTERY DEAD', 'SCREEN DEFECT', 'OTHER']
  },
  {
    id: 'crit-lc-vip-ash',
    name: 'Ashtray',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['FULL / NOT EMPTIED', 'DIRTY', 'MISSING', 'CRACKED', 'OTHER']
  },
  {
    id: 'crit-lc-vip-trash',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['OVERFLOWING', 'NO LINER BAG', 'DIRTY BIN', 'ODOR', 'OTHER']
  }
];

// 3. Cashier Standard Criteria (Cashier responsibility)
export const CASHIER_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-cash-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-cashier',
    predefinedReasons: ['DIRTY COUNTER', 'DUST', 'LITTER / TRASH', 'OTHER']
  },
  {
    id: 'crit-cash-read',
    name: 'Staff Readiness',
    defaultDepartmentId: 'dept-cashier',
    predefinedReasons: ['NOT AT POST', 'UNPREPARED', 'FLOAT CASH INCOMPLETE', 'OTHER']
  },
  {
    id: 'crit-cash-groom',
    name: 'Staff Grooming',
    defaultDepartmentId: 'dept-cashier',
    predefinedReasons: ['IMPROPER UNIFORM', 'NO NAME TAG', 'UNGROOMED', 'OTHER']
  },
  {
    id: 'crit-cash-equip',
    name: 'Equipment',
    defaultDepartmentId: 'dept-cashier',
    predefinedReasons: ['EDC MACHINE FAULT', 'CASH DRAWER JAMMED', 'RECEIPT PRINTER OUT OF PAPER', 'OTHER']
  },
  {
    id: 'crit-cash-pc',
    name: 'PC',
    defaultDepartmentId: 'dept-cashier',
    predefinedReasons: ['PC OFF', 'POS SYSTEM FROZEN', 'NETWORK DISCONNECTED', 'SCREEN ISSUE', 'OTHER']
  },
  {
    id: 'crit-cash-tidy',
    name: 'Tidiness',
    defaultDepartmentId: 'dept-cashier',
    predefinedReasons: ['CLUTTERED DESK', 'DISORGANIZED BILLS/RECEIPTS', 'ITEMS OUT OF PLACE', 'OTHER']
  }
];

// 4. Toilet Standard Criteria (Cleaning Service responsibility)
export const TOILET_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-toi-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY STALL', 'DIRTY FLOOR', 'ODOR', 'STAINED BOWL', 'OTHER']
  },
  {
    id: 'crit-toi-func',
    name: 'Function',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['FLUSH NOT WORKING', 'CLOGGED DRAIN', 'LEAKING PIPE', 'BROKEN LOCK', 'OTHER']
  },
  {
    id: 'crit-toi-trash',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['BIN OVERFLOWING', 'NO LINER BAG', 'DIRTY LID', 'OTHER']
  },
  {
    id: 'crit-toi-water',
    name: 'Water Pressure',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['LOW WATER PRESSURE', 'NO WATER', 'FAUCET DRIPPING', 'OTHER']
  },
  {
    id: 'crit-toi-tiss',
    name: 'Tissue',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['NO TOILET TISSUE', 'LOW TISSUE', 'DISPENSER BROKEN / JAMMED', 'OTHER']
  },
  {
    id: 'crit-toi-soap',
    name: 'Handsoap',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['NO HAND SOAP', 'LOW SOAP', 'DISPENSER CLOGGED', 'OTHER']
  },
  {
    id: 'crit-toi-dryer',
    name: 'Hand Dryer',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['NOT WORKING', 'NO WARM AIR', 'NOISY', 'OTHER']
  },
  {
    id: 'crit-toi-mirror',
    name: 'Mirror',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['SMUDGED / DIRTY', 'WATER SPOTS', 'CRACKED', 'OTHER']
  }
];

// 5. Lucky Cat Bar Criteria (Bar responsibility)
export const LUCKY_CAT_BAR_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-lc-bar-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DIRTY COUNTER', 'STICKY MATS', 'SPILL ON FLOOR', 'SPEED RAIL DIRTY', 'OTHER']
  },
  {
    id: 'crit-lc-bar-glass',
    name: 'Glassware',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DIRTY GLASSES', 'CHIPPED GLASS', 'INSUFFICIENT GLASSES', 'OTHER']
  },
  {
    id: 'crit-lc-bar-equip',
    name: 'Equipment',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['ICE MACHINE FAULT', 'BEER TAP DRIPPING', 'BLENDER FAULTY', 'COFFEE MACHINE ISSUE', 'OTHER']
  },
  {
    id: 'crit-lc-bar-groom',
    name: 'Staff Grooming',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['IMPROPER UNIFORM', 'NO APRON / NAME TAG', 'UNGROOMED', 'OTHER']
  },
  {
    id: 'crit-lc-bar-stock',
    name: 'Stock Availability',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['LOW BEVERAGE STOCK', 'NO ICE', 'GARNISH MISSING', 'MIXERS OUT', 'OTHER']
  },
  {
    id: 'crit-lc-bar-trash',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['OVERFLOWING', 'NO LINER BAG', 'DIRTY BIN', 'OTHER']
  },
  {
    id: 'crit-lc-bar-stor',
    name: 'Storage',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DISORGANIZED CHILLER', 'UNLABELED ITEMS', 'EXPIRED ITEMS', 'SPILL IN STORAGE', 'OTHER']
  },
  {
    id: 'crit-lc-bar-stool',
    name: 'Bar Stool',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['WOBBLY / BROKEN', 'DIRTY SEAT', 'DISORDERLY', 'OTHER']
  }
];

// 6. Lucky Cat Kitchen Criteria (Kitchen responsibility)
export const LUCKY_CAT_KITCHEN_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-lc-kit-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-kitchen',
    predefinedReasons: ['GREASY FLOOR', 'DIRTY PREP TABLE', 'HOOD DIRTY', 'SINK CLOGGED', 'OTHER']
  },
  {
    id: 'crit-lc-kit-glass',
    name: 'Glassware',
    defaultDepartmentId: 'dept-kitchen',
    predefinedReasons: ['DIRTY DISHES / UTENSILS', 'CHIPPED PLATES', 'INSUFFICIENT CUTLERY', 'OTHER']
  },
  {
    id: 'crit-lc-kit-stor',
    name: 'Storage',
    defaultDepartmentId: 'dept-kitchen',
    predefinedReasons: ['CHILLER TEMP HIGH', 'UNLABELED FOOD', 'CROSS CONTAMINATION RISK', 'DISORGANIZED DRY STORAGE', 'OTHER']
  },
  {
    id: 'crit-lc-kit-groom',
    name: 'Staff Grooming',
    defaultDepartmentId: 'dept-kitchen',
    predefinedReasons: ['NO CHEF HAT / HAIRNET', 'DIRTY APRON', 'IMPROPER FOOTWEAR', 'OTHER']
  }
];

// 7. Lucky Cat Public Area Criteria (Cleaning Service + Server)
export const LUCKY_CAT_PUBLIC_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-lc-pub-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY FLOOR', 'LITTER / DEBRIS', 'STAINED CARPET', 'DUST', 'OTHER']
  },
  {
    id: 'crit-lc-pub-odor',
    name: 'Odor',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['BAD ODOR', 'CIGARETTE SMELL', 'MUSTY', 'OTHER']
  },
  {
    id: 'crit-lc-pub-trash',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['BIN OVERFLOWING', 'NO LINER', 'DIRTY BIN', 'OTHER']
  },
  {
    id: 'crit-lc-pub-ash',
    name: 'Ashtrays',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['ASHTRAY FULL', 'DIRTY', 'MISSING', 'OTHER']
  },
  {
    id: 'crit-lc-pub-chairs',
    name: 'Chairs',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DISORDERLY', 'DIRTY SEATS', 'WOBBLY / DAMAGED', 'OTHER']
  },
  {
    id: 'crit-lc-pub-tables',
    name: 'Tables',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['STICKY TABLE', 'UNWIPED', 'WOBBLY', 'OTHER']
  },
  {
    id: 'crit-lc-pub-sofas',
    name: 'Sofas',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['STAINED UPHOLSTERY', 'CUSHIONS DISARRANGED', 'TORN', 'OTHER']
  },
  {
    id: 'crit-lc-pub-tv',
    name: 'TV',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['TV OFF', 'NO SIGNAL', 'REMOTE MISSING', 'SCREEN ISSUE', 'OTHER']
  },
  {
    id: 'crit-lc-pub-ac',
    name: 'Air Con',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['ROOM TOO WARM', 'AC LEAKING', 'AC OFF', 'NOISY UNIT', 'OTHER']
  },
  {
    id: 'crit-lc-pub-win',
    name: 'Windows and Mirrors',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['SMUDGED GLASS', 'FINGERPRINTS', 'DUSTY FRAME', 'OTHER']
  }
];

// 8. JPE KTV Room Criteria (Cleaning Service + Server)
export const JPE_KTV_ROOM_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-ktv-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY FLOOR', 'TABLE STICKY', 'DUST', 'ODOR', 'TRASH NOT REMOVED', 'OTHER']
  },
  {
    id: 'crit-ktv-mirr',
    name: 'Mirrors',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['SMUDGED / DIRTY', 'FINGERPRINTS', 'CRACKED', 'OTHER']
  },
  {
    id: 'crit-ktv-toilet',
    name: 'Toilet',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY TOILET', 'ODOR', 'NO SOAP / TISSUE', 'FLUSH ISSUE', 'OTHER']
  },
  {
    id: 'crit-ktv-sound',
    name: 'Sound System',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['NO SOUND', 'SPEAKER DISTORTED', 'AMPLIFIER OFF', 'FEEDBACK NOISE', 'OTHER']
  },
  {
    id: 'crit-ktv-kod',
    name: 'KOD',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['KOD SYSTEM FROZEN', 'SONG SELECTION ERROR', 'TOUCHSCREEN UNRESPONSIVE', 'OTHER']
  },
  {
    id: 'crit-ktv-tv',
    name: 'TV',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['TV OFF', 'NO DISPLAY / HDMI FAULT', 'SCREEN FLICKERING', 'OTHER']
  },
  {
    id: 'crit-ktv-exh',
    name: 'Exhaust',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['EXHAUST OFF', 'FAN NOISY', 'SMOKE ACCUMULATION', 'OTHER']
  },
  {
    id: 'crit-ktv-lamp',
    name: 'Lamp',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['LIGHT OFF', 'BULB BLOWN', 'DIMMER BROKEN', 'LED STRIP FAULTY', 'OTHER']
  },
  {
    id: 'crit-ktv-bar',
    name: 'Minibar',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['CHILLER NOT COLD', 'ITEMS MISSING', 'UNSTOCKED', 'DIRTY SHELF', 'OTHER']
  },
  {
    id: 'crit-ktv-ash',
    name: 'Ashtrays',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['FULL / NOT EMPTIED', 'DIRTY', 'MISSING', 'OTHER']
  },
  {
    id: 'crit-ktv-glass',
    name: 'Glassware',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['MISSING GLASSES', 'DIRTY GLASSES', 'CHIPPED', 'NO COASTERS', 'OTHER']
  },
  {
    id: 'crit-ktv-mic',
    name: 'Mic',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['BATTERY LOW', 'MIC NO SOUND', 'MIC COVER MISSING', 'MIC WIRE BROKEN', 'OTHER']
  },
  {
    id: 'crit-ktv-tiss',
    name: 'Tissue',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['NO TISSUE', 'LOW TISSUE', 'DISPENSER EMPTY', 'OTHER']
  },
  {
    id: 'crit-ktv-door',
    name: 'Doors',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DOOR NOT CLOSING', 'HANDLE LOOSE', 'LOCK STUCK', 'DAMAGED', 'OTHER']
  },
  {
    id: 'crit-ktv-ac',
    name: 'Air Cons',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['NOT COOLING', 'AC LEAKING WATER', 'REMOTE MISSING / DEAD', 'NOISY UNIT', 'OTHER']
  }
];

// 9. JPE KTV Public Toilet Criteria (Cleaning Service responsibility)
export const JPE_KTV_PUBLIC_TOILET_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-ktv-ptoi-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY STALL', 'DIRTY FLOOR', 'ODOR', 'OTHER']
  },
  {
    id: 'crit-ktv-ptoi-mirr',
    name: 'Mirror',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['SMUDGED', 'WATER SPOTS', 'DIRTY', 'OTHER']
  },
  {
    id: 'crit-ktv-ptoi-func',
    name: 'Function',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['FLUSH FAULT', 'CLOGGED DRAIN', 'PIPE LEAK', 'OTHER']
  },
  {
    id: 'crit-ktv-ptoi-trash',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['OVERFLOWING', 'NO LINER BAG', 'DIRTY', 'OTHER']
  },
  {
    id: 'crit-ktv-ptoi-tiss',
    name: 'Tissue',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['NO TISSUE', 'LOW TISSUE', 'DISPENSER BROKEN', 'OTHER']
  },
  {
    id: 'crit-ktv-ptoi-soap',
    name: 'Soap',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['NO SOAP', 'DISPENSER CLOGGED', 'OTHER']
  }
];

// 10. JPE KTV Bar Criteria (Bar responsibility)
export const JPE_KTV_BAR_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-ktv-bar-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DIRTY COUNTER', 'FLOOR SPILLS', 'MATS DIRTY', 'OTHER']
  },
  {
    id: 'crit-ktv-bar-stor',
    name: 'Storage',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DISORGANIZED', 'UNLABELED ITEMS', 'SPILL IN STORAGE', 'OTHER']
  },
  {
    id: 'crit-ktv-bar-chill',
    name: 'Chiller',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['TEMPERATURE HIGH (>4°C)', 'DOOR NOT SEALING', 'CONDENSATION LEAK', 'OTHER']
  },
  {
    id: 'crit-ktv-bar-glass',
    name: 'Glassware',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DIRTY GLASSES', 'CHIPPED', 'INSUFFICIENT STOCK', 'OTHER']
  },
  {
    id: 'crit-ktv-bar-uten',
    name: 'Utensils',
    defaultDepartmentId: 'dept-bar',
    predefinedReasons: ['DIRTY SHAKERS / JIGGERS', 'MISSING UTENSILS', 'NOT SANITIZED', 'OTHER']
  }
];

// 11. JPE KTV Public Area Criteria (Cleaning Service + Server)
export const JPE_KTV_PUBLIC_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-ktv-pub-lobby',
    name: 'Lobby Area',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY FLOOR', 'LITTER / DEBRIS', 'STAINED FLOOR', 'OTHER']
  },
  {
    id: 'crit-ktv-pub-mirr',
    name: 'Mirrors',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['SMUDGED', 'FINGERPRINTS', 'DUSTY', 'OTHER']
  },
  {
    id: 'crit-ktv-pub-hall',
    name: 'Hallway',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY CARPET / TILE', 'LITTER', 'OBSTRUCTION IN CORRIDOR', 'OTHER']
  },
  {
    id: 'crit-ktv-pub-light',
    name: 'Lighting',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['BULB BLOWN', 'FLICKERING', 'SIGNAGE UNLIT', 'OTHER']
  },
  {
    id: 'crit-ktv-pub-ac',
    name: 'Air Cons',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['HALLWAY TOO WARM', 'AC DRIPPING', 'AC OFF', 'OTHER']
  },
  {
    id: 'crit-ktv-pub-sofa',
    name: 'Sofa',
    defaultDepartmentId: 'dept-server',
    predefinedReasons: ['DIRTY CUSHION', 'TORN FABRIC', 'DISORDERLY', 'OTHER']
  },
  {
    id: 'crit-ktv-pub-trash',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['OVERFLOWING', 'NO LINER BAG', 'DIRTY', 'OTHER']
  }
];

// 12. JPE KTV Lift / Elevator Criteria (Cleaning Service responsibility)
export const JPE_KTV_LIFT_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-ktv-lift-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['DIRTY FLOOR', 'SMUDGED BUTTONS / WALLS', 'TRASH INSIDE', 'OTHER']
  },
  {
    id: 'crit-ktv-lift-odor',
    name: 'Odor',
    defaultDepartmentId: 'dept-clean',
    predefinedReasons: ['BAD ODOR', 'MUSTY', 'CIGARETTE SMELL', 'OTHER']
  }
];

// 13. Ground Lobby Criteria (Security responsibility)
export const GROUND_LOBBY_SECURITY_DESK_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-gl-sec-equip',
    name: 'Equipment',
    defaultDepartmentId: 'dept-security',
    predefinedReasons: ['CCTV MONITOR OFF', 'WALKIE TALKIE FAULT', 'TORCH / BATTERY DEAD', 'LOGBOOK MISSING', 'OTHER']
  },
  {
    id: 'crit-gl-sec-clean',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-security',
    predefinedReasons: ['DIRTY DESK', 'DUST', 'LITTER / TRASH', 'OTHER']
  }
];

export const GROUND_LOBBY_TRASHCAN_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-gl-trash-bin',
    name: 'Trashcan',
    defaultDepartmentId: 'dept-security',
    predefinedReasons: ['OVERFLOWING', 'NO LINER BAG', 'DIRTY BIN', 'ODOR', 'OTHER']
  }
];

export const GROUND_LOBBY_CLEANLINESS_CRITERIA: CriterionTemplate[] = [
  {
    id: 'crit-gl-clean-area',
    name: 'Cleanliness',
    defaultDepartmentId: 'dept-security',
    predefinedReasons: ['LOBBY FLOOR DIRTY', 'LITTER AT ENTRANCE', 'WATER / RAIN PUDDLE', 'OTHER']
  }
];

// Reusable blueprint definitions for the Template Manager
export interface ItemBlueprintDefinition {
  id: string;
  name: string;
  category: 'LUCKY CAT' | 'JPE KTV' | 'GROUND LOBBY' | 'GENERAL';
  defaultNamePrefix: string;
  criteria: CriterionTemplate[];
}

export const REUSABLE_BLUEPRINTS: ItemBlueprintDefinition[] = [
  {
    id: 'bp-lc-pool-table',
    name: 'Lucky Cat Pool Table Standard',
    category: 'LUCKY CAT',
    defaultNamePrefix: 'Pool Table ',
    criteria: LUCKY_CAT_POOL_TABLE_CRITERIA
  },
  {
    id: 'bp-lc-vip-pool-room',
    name: 'Lucky Cat VIP Pool Room Standard',
    category: 'LUCKY CAT',
    defaultNamePrefix: 'VIP Pool Room ',
    criteria: LUCKY_CAT_VIP_POOL_ROOM_CRITERIA
  },
  {
    id: 'bp-cashier',
    name: 'Cashier Standard',
    category: 'GENERAL',
    defaultNamePrefix: 'Cashier',
    criteria: CASHIER_CRITERIA
  },
  {
    id: 'bp-toilet',
    name: 'Toilet Standard',
    category: 'GENERAL',
    defaultNamePrefix: 'Toilet',
    criteria: TOILET_CRITERIA
  },
  {
    id: 'bp-lc-bar',
    name: 'Lucky Cat Bar Standard',
    category: 'LUCKY CAT',
    defaultNamePrefix: 'Bar',
    criteria: LUCKY_CAT_BAR_CRITERIA
  },
  {
    id: 'bp-lc-kitchen',
    name: 'Lucky Cat Kitchen Standard',
    category: 'LUCKY CAT',
    defaultNamePrefix: 'Kitchen',
    criteria: LUCKY_CAT_KITCHEN_CRITERIA
  },
  {
    id: 'bp-lc-public',
    name: 'Lucky Cat Public Area Standard',
    category: 'LUCKY CAT',
    defaultNamePrefix: 'Public Area',
    criteria: LUCKY_CAT_PUBLIC_CRITERIA
  },
  {
    id: 'bp-ktv-room',
    name: 'JPE KTV Room Standard',
    category: 'JPE KTV',
    defaultNamePrefix: 'Room ',
    criteria: JPE_KTV_ROOM_CRITERIA
  },
  {
    id: 'bp-ktv-pub-toilet',
    name: 'JPE KTV Public Toilet Standard',
    category: 'JPE KTV',
    defaultNamePrefix: 'Public Toilet',
    criteria: JPE_KTV_PUBLIC_TOILET_CRITERIA
  },
  {
    id: 'bp-ktv-bar',
    name: 'JPE KTV Bar Standard',
    category: 'JPE KTV',
    defaultNamePrefix: 'Bar',
    criteria: JPE_KTV_BAR_CRITERIA
  },
  {
    id: 'bp-ktv-public',
    name: 'JPE KTV Public Area Standard',
    category: 'JPE KTV',
    defaultNamePrefix: 'Public Area',
    criteria: JPE_KTV_PUBLIC_CRITERIA
  },
  {
    id: 'bp-ktv-lift',
    name: 'JPE KTV Lift / Elevator Standard',
    category: 'JPE KTV',
    defaultNamePrefix: 'Lift / Elevator',
    criteria: JPE_KTV_LIFT_CRITERIA
  },
  {
    id: 'bp-gl-sec-desk',
    name: 'Ground Lobby Security Desk Standard',
    category: 'GROUND LOBBY',
    defaultNamePrefix: 'Security Desk',
    criteria: GROUND_LOBBY_SECURITY_DESK_CRITERIA
  },
  {
    id: 'bp-gl-trashcan',
    name: 'Ground Lobby Trashcan Standard',
    category: 'GROUND LOBBY',
    defaultNamePrefix: 'Trashcan',
    criteria: GROUND_LOBBY_TRASHCAN_CRITERIA
  },
  {
    id: 'bp-gl-cleanliness',
    name: 'Ground Lobby Cleanliness Standard',
    category: 'GROUND LOBBY',
    defaultNamePrefix: 'Cleanliness',
    criteria: GROUND_LOBBY_CLEANLINESS_CRITERIA
  }
];

// Legacy exports for backwards compatibility
export const DEFAULT_ROOM_CRITERIA = JPE_KTV_ROOM_CRITERIA;
export const DEFAULT_BILLIARD_CRITERIA = LUCKY_CAT_POOL_TABLE_CRITERIA;
export const DEFAULT_BAR_CRITERIA = LUCKY_CAT_BAR_CRITERIA;
export const DEFAULT_KITCHEN_CRITERIA = LUCKY_CAT_KITCHEN_CRITERIA;
export const DEFAULT_PUBLIC_CRITERIA = LUCKY_CAT_PUBLIC_CRITERIA;

// ==========================================
// REAL VENUE TEMPLATE BUILDER
// ==========================================

export function getInitialVenueTemplate(): VenueTemplate {
  // 1. LUCKY CAT
  // Pool Tables: 01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12 (Table 04 does NOT exist!)
  const poolTableNumbers = ['01', '02', '03', '05', '06', '07', '08', '09', '10', '11', '12'];
  const poolTableItems: ItemTemplate[] = poolTableNumbers.map((num, idx) => ({
    id: `item-lc-pt-${num}`,
    name: `Pool Table ${num}`,
    areaId: 'area-lucky-cat',
    order: idx + 1,
    criteria: JSON.parse(JSON.stringify(LUCKY_CAT_POOL_TABLE_CRITERIA))
  }));

  // VIP Pool Rooms: 01, 02, 03
  const vipRoomNumbers = ['01', '02', '03'];
  const vipRoomItems: ItemTemplate[] = vipRoomNumbers.map((num, idx) => ({
    id: `item-lc-vip-${num}`,
    name: `VIP Pool Room ${num}`,
    areaId: 'area-lucky-cat',
    order: poolTableNumbers.length + idx + 1,
    criteria: JSON.parse(JSON.stringify(LUCKY_CAT_VIP_POOL_ROOM_CRITERIA))
  }));

  // Other Lucky Cat Items
  const luckyCatOtherItems: ItemTemplate[] = [
    {
      id: 'item-lc-cashier',
      name: 'Cashier',
      areaId: 'area-lucky-cat',
      order: 15,
      criteria: JSON.parse(JSON.stringify(CASHIER_CRITERIA))
    },
    {
      id: 'item-lc-toilet',
      name: 'Toilet',
      areaId: 'area-lucky-cat',
      order: 16,
      criteria: JSON.parse(JSON.stringify(TOILET_CRITERIA))
    },
    {
      id: 'item-lc-bar',
      name: 'Bar',
      areaId: 'area-lucky-cat',
      order: 17,
      criteria: JSON.parse(JSON.stringify(LUCKY_CAT_BAR_CRITERIA))
    },
    {
      id: 'item-lc-kitchen',
      name: 'Kitchen',
      areaId: 'area-lucky-cat',
      order: 18,
      criteria: JSON.parse(JSON.stringify(LUCKY_CAT_KITCHEN_CRITERIA))
    },
    {
      id: 'item-lc-public',
      name: 'Public Area',
      areaId: 'area-lucky-cat',
      order: 19,
      criteria: JSON.parse(JSON.stringify(LUCKY_CAT_PUBLIC_CRITERIA))
    }
  ];

  // 2. JPE KTV
  // 2nd Floor: 201, 202, 203, 205, 206 (Room 204 does NOT exist!)
  // 3rd Floor: 301, 302, 303, 305, 306, 307, 308, 309, 310, 311, 312 (Room 304 does NOT exist!)
  const ktvRoomNumbers = [
    '201', '202', '203', '205', '206',
    '301', '302', '303', '305', '306', '307', '308', '309', '310', '311', '312'
  ];

  const ktvRoomItems: ItemTemplate[] = ktvRoomNumbers.map((num, idx) => ({
    id: `item-ktv-${num}`,
    name: `Room ${num}`,
    areaId: 'area-jpe-ktv',
    order: idx + 1,
    criteria: JSON.parse(JSON.stringify(JPE_KTV_ROOM_CRITERIA))
  }));

  // Other JPE KTV Items
  const ktvOtherItems: ItemTemplate[] = [
    {
      id: 'item-ktv-pub-toilet',
      name: 'Public Toilet',
      areaId: 'area-jpe-ktv',
      order: ktvRoomNumbers.length + 1,
      criteria: JSON.parse(JSON.stringify(JPE_KTV_PUBLIC_TOILET_CRITERIA))
    },
    {
      id: 'item-ktv-bar',
      name: 'Bar',
      areaId: 'area-jpe-ktv',
      order: ktvRoomNumbers.length + 2,
      criteria: JSON.parse(JSON.stringify(JPE_KTV_BAR_CRITERIA))
    },
    {
      id: 'item-ktv-cashier',
      name: 'Cashier',
      areaId: 'area-jpe-ktv',
      order: ktvRoomNumbers.length + 3,
      criteria: JSON.parse(JSON.stringify(CASHIER_CRITERIA))
    },
    {
      id: 'item-ktv-public',
      name: 'Public Area',
      areaId: 'area-jpe-ktv',
      order: ktvRoomNumbers.length + 4,
      criteria: JSON.parse(JSON.stringify(JPE_KTV_PUBLIC_CRITERIA))
    },
    {
      id: 'item-ktv-lift',
      name: 'Lift / Elevator',
      areaId: 'area-jpe-ktv',
      order: ktvRoomNumbers.length + 5,
      criteria: JSON.parse(JSON.stringify(JPE_KTV_LIFT_CRITERIA))
    }
  ];

  // 3. GROUND LOBBY
  const groundLobbyItems: ItemTemplate[] = [
    {
      id: 'item-gl-sec-desk',
      name: 'Security Desk',
      areaId: 'area-ground-lobby',
      order: 1,
      criteria: JSON.parse(JSON.stringify(GROUND_LOBBY_SECURITY_DESK_CRITERIA))
    },
    {
      id: 'item-gl-trashcan',
      name: 'Trashcan',
      areaId: 'area-ground-lobby',
      order: 2,
      criteria: JSON.parse(JSON.stringify(GROUND_LOBBY_TRASHCAN_CRITERIA))
    },
    {
      id: 'item-gl-cleanliness',
      name: 'Cleanliness',
      areaId: 'area-ground-lobby',
      order: 3,
      criteria: JSON.parse(JSON.stringify(GROUND_LOBBY_CLEANLINESS_CRITERIA))
    }
  ];

  return {
    version: 3,
    lastModified: new Date().toISOString(),
    venues: DEFAULT_VENUES,
    blueprints: [
      {
        id: 'bp-ktv-std',
        name: 'KTV Standard Room',
        description: 'Standard karaoke suite inspection: TV screen, audio, microphones, sofa, air-con, lighting & hygiene',
        venueCompatibility: ['venue-jpe-ktv', 'ALL'],
        defaultDepartmentId: 'dept-server',
        criteria: JSON.parse(JSON.stringify(JPE_KTV_ROOM_CRITERIA)),
        defaultPriority: 'NORMAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-ktv-vip',
        name: 'KTV VIP Room',
        description: 'Large VIP KTV suite with dedicated minibar, private toilet, audio mixer, and smoke exhaust',
        venueCompatibility: ['venue-jpe-ktv', 'ALL'],
        defaultDepartmentId: 'dept-server',
        criteria: [
          ...JSON.parse(JSON.stringify(JPE_KTV_ROOM_CRITERIA)),
          {
            id: 'crit-ktv-vip-minibar',
            name: 'VIP Mini Bar',
            defaultDepartmentId: 'dept-bar',
            predefinedReasons: ['OUT OF STOCK', 'FRIDGE NOT COOLING', 'DIRTY GLASSES', 'OTHER']
          }
        ],
        defaultPriority: 'HIGH',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-lc-pool',
        name: 'Pool Table Standard',
        description: 'Billiards pool table, cloth condition, balls, extension cues, chalk, rack paper, overhead lamp',
        venueCompatibility: ['venue-lucky-cat', 'ALL'],
        defaultDepartmentId: 'dept-server',
        criteria: JSON.parse(JSON.stringify(LUCKY_CAT_POOL_TABLE_CRITERIA)),
        defaultPriority: 'NORMAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-lc-vip-pool',
        name: 'VIP Pool Room',
        description: 'Private pool room with lounge seating, ambient lamps, TV, exhaust, and full table setup',
        venueCompatibility: ['venue-lucky-cat', 'ALL'],
        defaultDepartmentId: 'dept-server',
        criteria: JSON.parse(JSON.stringify(LUCKY_CAT_VIP_POOL_ROOM_CRITERIA)),
        defaultPriority: 'HIGH',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-pub-toilet',
        name: 'Public Restroom / Toilet',
        description: 'Hand wash soap, tissue, water pressure, floor cleanliness, mirror & bin check',
        venueCompatibility: ['ALL'],
        defaultDepartmentId: 'dept-clean',
        criteria: JSON.parse(JSON.stringify(JPE_KTV_PUBLIC_TOILET_CRITERIA)),
        defaultPriority: 'HIGH',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-bar-counter',
        name: 'Bar & Beverage Counter',
        description: 'Glassware, draft lines, ice bin, POS sync, bar mats, optics and bottle display',
        venueCompatibility: ['ALL'],
        defaultDepartmentId: 'dept-bar',
        criteria: JSON.parse(JSON.stringify(JPE_KTV_BAR_CRITERIA)),
        defaultPriority: 'NORMAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-cashier-pos',
        name: 'Cashier Station & POS',
        description: 'Register receipt paper, card terminal, float verification, safe, tidy workspace',
        venueCompatibility: ['ALL'],
        defaultDepartmentId: 'dept-cashier',
        criteria: JSON.parse(JSON.stringify(CASHIER_CRITERIA)),
        defaultPriority: 'NORMAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-public-lounge',
        name: 'Public Lounge & Corridor',
        description: 'Hallway lighting, safety signage, carpet condition, odor, emergency exits',
        venueCompatibility: ['ALL'],
        defaultDepartmentId: 'dept-clean',
        criteria: JSON.parse(JSON.stringify(JPE_KTV_PUBLIC_CRITERIA)),
        defaultPriority: 'NORMAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'bp-sec-desk',
        name: 'Security & Front Entrance',
        description: 'Guest registry, walkie-talkies, CCTV view, entrance cleanliness, emergency kit',
        venueCompatibility: ['venue-ground-lobby', 'ALL'],
        defaultDepartmentId: 'dept-security',
        criteria: JSON.parse(JSON.stringify(GROUND_LOBBY_SECURITY_DESK_CRITERIA)),
        defaultPriority: 'NORMAL',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    departments: DEFAULT_DEPARTMENTS,
    areas: [
      {
        id: 'area-lucky-cat',
        name: 'LUCKY CAT',
        venueId: 'venue-lucky-cat',
        venueName: 'LUCKY CAT',
        icon: 'Disc',
        order: 1,
        items: [...poolTableItems, ...vipRoomItems, ...luckyCatOtherItems]
      },
      {
        id: 'area-jpe-ktv',
        name: 'JPE KTV',
        venueId: 'venue-jpe-ktv',
        venueName: 'JPE KTV',
        icon: 'Mic',
        order: 2,
        items: [...ktvRoomItems, ...ktvOtherItems]
      },
      {
        id: 'area-ground-lobby',
        name: 'GROUND LOBBY',
        venueId: 'venue-ground-lobby',
        venueName: 'GROUND LOBBY',
        icon: 'Shield',
        order: 3,
        items: groundLobbyItems
      }
    ]
  };
}

export const INITIAL_SETTINGS: AppSettings = {
  venueName: 'LUCKY CAT & JPE KTV',
  venues: DEFAULT_VENUES,
  autoLockMinutes: 5,
  soundFeedback: true,
  enableFastQuickGood: true,
  tabletMode: 'LANDSCAPE_LOCKED',
  isFirstTimeSetupDone: true,
  lastBackupDate: undefined,
  reminderSettings: {
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    dueSoonMinutes: 15,
    overdueIntervalMinutes: 30,
    maxRemindersPerTask: 3
  }
};

// Default PINs: Manager = "8888", Assistant Manager = "1234"
// SHA-256 pre-hashed with salt "DAILY_OPS_SALT_"
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-manager',
    role: 'MANAGER',
    name: 'General Manager',
    // Hash of "DAILY_OPS_SALT_8888"
    pinHash: 'd1145c591d8b23e580854e7c46e0faceb14abed2e1d78f5b8da860fd4403e2ec',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-asst-manager',
    role: 'ASSISTANT_MANAGER',
    name: 'Assistant Manager',
    // Hash of "DAILY_OPS_SALT_1234"
    pinHash: '1440f0bcfbaa01244a7e3d47bff16825e6a13c973171401867c686bc194286b0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user-staff',
    role: 'STAFF',
    name: 'Floor Staff',
    // Hash of "DAILY_OPS_SALT_5555"
    pinHash: '978b4356510a90ad9eda662f44c908a75fd16aab2ffc1d85a08642c253e672ff',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function getSampleHistoryData(): { 
  inspections: DailyInspection[]; 
  issues: OperationalIssue[]; 
  tasks: DailyTask[];
  notes?: ShiftNote[];
} {
  const dToday = new Date();
  const dYesterday = new Date(dToday.getTime() - 86400000);
  const d2DaysAgo = new Date(dToday.getTime() - 86400000 * 2);

  const dateTodayStr = dToday.toISOString().slice(0, 10);
  const dateYestStr = dYesterday.toISOString().slice(0, 10);
  const date2DaysAgoStr = d2DaysAgo.toISOString().slice(0, 10);

  const sampleNotes: ShiftNote[] = [
    {
      id: 'note-01',
      date: dateTodayStr,
      authorId: 'user-manager',
      authorName: 'General Manager',
      authorRole: 'MANAGER',
      content: 'VIP Room 02 booked for corporate event at 20:00. Verify ice bucket and drink glasses.',
      category: 'HANDOVER',
      status: 'OPEN',
      createdAt: `${dateTodayStr}T16:30:00.000Z`,
      updatedAt: `${dateTodayStr}T16:30:00.000Z`,
    },
    {
      id: 'note-02',
      date: dateTodayStr,
      authorId: 'user-asst-manager',
      authorName: 'Assistant Manager',
      authorRole: 'ASSISTANT_MANAGER',
      content: 'Pool Table 07 extension cue repaired with spare bridge head.',
      category: 'MAINTENANCE',
      status: 'DONE',
      createdAt: `${dateTodayStr}T15:10:00.000Z`,
      updatedAt: `${dateTodayStr}T16:00:00.000Z`,
      completedAt: `${dateTodayStr}T16:00:00.000Z`,
      completedByName: 'Assistant Manager',
    }
  ];

  const sampleIssues: OperationalIssue[] = [
    // Today issue 1: Room 301 Toilet (Not Ready)
    {
      id: 'iss-today-01',
      inspectionDate: dateTodayStr,
      inspectionId: `INSP-${dateTodayStr}`,
      areaId: 'area-jpe-ktv',
      areaName: 'JPE KTV',
      itemId: 'item-ktv-301',
      itemName: 'Room 301',
      criterionId: 'crit-ktv-toilet',
      criterionName: 'Toilet',
      specificProblems: ['DIRTY TOILET', 'NO SOAP / TISSUE'],
      discoveredAt: `${dateTodayStr}T15:45:00.000Z`,
      discoveredByRole: 'MANAGER',
      discoveredByName: 'General Manager',
      originalInspectionStatus: 'NOT_OK',
      departmentId: 'dept-clean',
      departmentName: 'Cleaning Service',
      currentStatus: 'NOT_READY',
      statusUpdatedAt: `${dateTodayStr}T15:45:00.000Z`,
      reopenCount: 0,
      auditTrail: [
        {
          id: 'aud-01',
          timestamp: `${dateTodayStr}T15:45:00.000Z`,
          action: 'CREATED',
          newStatus: 'NOT_READY',
          performedByRole: 'MANAGER',
          performedByName: 'General Manager',
          notes: 'Discovered during initial daily walkthrough',
          departmentName: 'Cleaning Service'
        }
      ]
    },
    // Today issue 2: Pool Table 05 Overhead Lamp (In Process)
    {
      id: 'iss-today-02',
      inspectionDate: dateTodayStr,
      inspectionId: `INSP-${dateTodayStr}`,
      areaId: 'area-lucky-cat',
      areaName: 'LUCKY CAT',
      itemId: 'item-lc-pt-05',
      itemName: 'Pool Table 05',
      criterionId: 'crit-lc-pt-light',
      criterionName: 'Overhead Lamp',
      specificProblems: ['BULB BLOWN'],
      discoveredAt: `${dateTodayStr}T15:52:00.000Z`,
      discoveredByRole: 'MANAGER',
      discoveredByName: 'General Manager',
      originalInspectionStatus: 'NOT_OK',
      departmentId: 'dept-server',
      departmentName: 'Server',
      currentStatus: 'IN_PROCESS',
      statusUpdatedAt: `${dateTodayStr}T16:15:00.000Z`,
      reopenCount: 0,
      auditTrail: [
        {
          id: 'aud-02-1',
          timestamp: `${dateTodayStr}T15:52:00.000Z`,
          action: 'CREATED',
          newStatus: 'NOT_READY',
          performedByRole: 'MANAGER',
          performedByName: 'General Manager',
          departmentName: 'Server'
        },
        {
          id: 'aud-02-2',
          timestamp: `${dateTodayStr}T16:15:00.000Z`,
          action: 'STATUS_CHANGED',
          previousStatus: 'NOT_READY',
          newStatus: 'IN_PROCESS',
          performedByRole: 'ASSISTANT_MANAGER',
          performedByName: 'Assistant Manager',
          notes: 'Replacing 6500K LED bulb tube'
        }
      ]
    },
    // Today issue 3: Lucky Cat Kitchen Floor (Waiting verification)
    {
      id: 'iss-today-03',
      inspectionDate: dateTodayStr,
      inspectionId: `INSP-${dateTodayStr}`,
      areaId: 'area-lucky-cat',
      areaName: 'LUCKY CAT',
      itemId: 'item-lc-kitchen',
      itemName: 'Kitchen',
      criterionId: 'crit-lc-kit-clean',
      criterionName: 'Cleanliness',
      specificProblems: ['GREASY FLOOR'],
      discoveredAt: `${dateTodayStr}T16:05:00.000Z`,
      discoveredByRole: 'MANAGER',
      discoveredByName: 'General Manager',
      originalInspectionStatus: 'NOT_OK',
      departmentId: 'dept-kitchen',
      departmentName: 'Kitchen',
      currentStatus: 'WAITING_VERIFICATION',
      statusUpdatedAt: `${dateTodayStr}T16:40:00.000Z`,
      resolutionInfo: {
        resolvedAt: `${dateTodayStr}T16:40:00.000Z`,
        resolvedByName: 'Assistant Manager',
        notes: 'Degreased with hot water pressure wash by kitchen team'
      },
      reopenCount: 0,
      auditTrail: [
        {
          id: 'aud-03-1',
          timestamp: `${dateTodayStr}T16:05:00.000Z`,
          action: 'CREATED',
          newStatus: 'NOT_READY',
          performedByRole: 'MANAGER',
          performedByName: 'General Manager',
          departmentName: 'Kitchen'
        },
        {
          id: 'aud-03-2',
          timestamp: `${dateTodayStr}T16:10:00.000Z`,
          action: 'STATUS_CHANGED',
          previousStatus: 'NOT_READY',
          newStatus: 'IN_PROCESS',
          performedByRole: 'ASSISTANT_MANAGER',
          performedByName: 'Assistant Manager'
        },
        {
          id: 'aud-03-3',
          timestamp: `${dateTodayStr}T16:40:00.000Z`,
          action: 'STATUS_CHANGED',
          previousStatus: 'IN_PROCESS',
          newStatus: 'WAITING_VERIFICATION',
          performedByRole: 'ASSISTANT_MANAGER',
          performedByName: 'Assistant Manager',
          notes: 'Degreaser applied and scrubbed clean'
        }
      ]
    },
    // Today issue 4: Lucky Cat Bar Cleanliness (Verified)
    {
      id: 'iss-today-04',
      inspectionDate: dateTodayStr,
      inspectionId: `INSP-${dateTodayStr}`,
      areaId: 'area-lucky-cat',
      areaName: 'LUCKY CAT',
      itemId: 'item-lc-bar',
      itemName: 'Bar',
      criterionId: 'crit-lc-bar-clean',
      criterionName: 'Cleanliness',
      specificProblems: ['STICKY MATS'],
      discoveredAt: `${dateTodayStr}T15:58:00.000Z`,
      discoveredByRole: 'MANAGER',
      discoveredByName: 'General Manager',
      originalInspectionStatus: 'NOT_OK',
      departmentId: 'dept-bar',
      departmentName: 'Bar',
      currentStatus: 'VERIFIED',
      statusUpdatedAt: `${dateTodayStr}T17:10:00.000Z`,
      resolutionInfo: {
        resolvedAt: `${dateTodayStr}T16:30:00.000Z`,
        resolvedByName: 'Assistant Manager',
        notes: 'Bar mats washed and sanitized'
      },
      verificationInfo: {
        verifiedAt: `${dateTodayStr}T17:10:00.000Z`,
        verifiedByName: 'General Manager',
        verifiedByRole: 'MANAGER',
        notes: 'Checked and confirmed bar counter clean'
      },
      reopenCount: 0,
      auditTrail: [
        {
          id: 'aud-04-1',
          timestamp: `${dateTodayStr}T15:58:00.000Z`,
          action: 'CREATED',
          newStatus: 'NOT_READY',
          performedByRole: 'MANAGER',
          performedByName: 'General Manager',
          departmentName: 'Bar'
        },
        {
          id: 'aud-04-2',
          timestamp: `${dateTodayStr}T16:30:00.000Z`,
          action: 'STATUS_CHANGED',
          previousStatus: 'NOT_READY',
          newStatus: 'WAITING_VERIFICATION',
          performedByRole: 'ASSISTANT_MANAGER',
          performedByName: 'Assistant Manager'
        },
        {
          id: 'aud-04-3',
          timestamp: `${dateTodayStr}T17:10:00.000Z`,
          action: 'VERIFIED',
          previousStatus: 'WAITING_VERIFICATION',
          newStatus: 'VERIFIED',
          performedByRole: 'MANAGER',
          performedByName: 'General Manager',
          notes: 'Checked personally, mats sanitized'
        }
      ]
    },
    // Yesterday issue: Room 301 Cleanliness (Verified)
    {
      id: 'iss-yest-01',
      inspectionDate: dateYestStr,
      inspectionId: `INSP-${dateYestStr}`,
      areaId: 'area-jpe-ktv',
      areaName: 'JPE KTV',
      itemId: 'item-ktv-301',
      itemName: 'Room 301',
      criterionId: 'crit-ktv-clean',
      criterionName: 'Cleanliness',
      specificProblems: ['DIRTY FLOOR', 'TABLE STICKY'],
      discoveredAt: `${dateYestStr}T16:00:00.000Z`,
      discoveredByRole: 'MANAGER',
      discoveredByName: 'General Manager',
      originalInspectionStatus: 'NOT_OK',
      departmentId: 'dept-clean',
      departmentName: 'Cleaning Service',
      currentStatus: 'VERIFIED',
      statusUpdatedAt: `${dateYestStr}T17:40:00.000Z`,
      verificationInfo: {
        verifiedAt: `${dateYestStr}T17:40:00.000Z`,
        verifiedByName: 'General Manager',
        verifiedByRole: 'MANAGER'
      },
      reopenCount: 0,
      auditTrail: []
    },
    // 2 Days ago issue: Room 301 Mirrors (Verified)
    {
      id: 'iss-2days-01',
      inspectionDate: date2DaysAgoStr,
      inspectionId: `INSP-${date2DaysAgoStr}`,
      areaId: 'area-jpe-ktv',
      areaName: 'JPE KTV',
      itemId: 'item-ktv-301',
      itemName: 'Room 301',
      criterionId: 'crit-ktv-mirr',
      criterionName: 'Mirrors',
      specificProblems: ['SMUDGED / DIRTY'],
      discoveredAt: `${date2DaysAgoStr}T15:30:00.000Z`,
      discoveredByRole: 'MANAGER',
      discoveredByName: 'General Manager',
      originalInspectionStatus: 'NOT_OK',
      departmentId: 'dept-clean',
      departmentName: 'Cleaning Service',
      currentStatus: 'VERIFIED',
      statusUpdatedAt: `${date2DaysAgoStr}T16:45:00.000Z`,
      verificationInfo: {
        verifiedAt: `${date2DaysAgoStr}T16:45:00.000Z`,
        verifiedByName: 'General Manager',
        verifiedByRole: 'MANAGER'
      },
      reopenCount: 0,
      auditTrail: []
    }
  ];

  const inspections: DailyInspection[] = [
    {
      id: `INSP-${dateTodayStr}`,
      date: dateTodayStr,
      startedAt: `${dateTodayStr}T15:30:00.000Z`,
      startedByName: 'General Manager',
      startedByRole: 'MANAGER',
      completedAt: `${dateTodayStr}T16:15:00.000Z`,
      completedByName: 'General Manager',
      isCompleted: true,
      handedOverAt: `${dateTodayStr}T16:20:00.000Z`,
      handedOverByName: 'General Manager',
      isHandedOver: true,
      totalItems: 43,
      readyItems: 39,
      notReadyItems: 4,
      naItems: 0,
      totalIssuesCount: 4,
      itemResults: {
        'item-ktv-301': {
          itemId: 'item-ktv-301',
          itemName: 'Room 301',
          areaId: 'area-jpe-ktv',
          areaName: 'JPE KTV',
          overallStatus: 'NOT_READY',
          criterionResults: [
            { criterionId: 'crit-ktv-clean', criterionName: 'Cleanliness', status: 'GOOD', selectedReasons: [] },
            { criterionId: 'crit-ktv-mirr', criterionName: 'Mirrors', status: 'GOOD', selectedReasons: [] },
            { criterionId: 'crit-ktv-toilet', criterionName: 'Toilet', status: 'NOT_OK', selectedReasons: ['DIRTY TOILET', 'NO SOAP / TISSUE'], issueId: 'iss-today-01' }
          ]
        },
        'item-lc-pt-05': {
          itemId: 'item-lc-pt-05',
          itemName: 'Pool Table 05',
          areaId: 'area-lucky-cat',
          areaName: 'LUCKY CAT',
          overallStatus: 'NOT_READY',
          criterionResults: [
            { criterionId: 'crit-lc-pt-clean', criterionName: 'Cleanliness', status: 'GOOD', selectedReasons: [] },
            { criterionId: 'crit-lc-pt-light', criterionName: 'Overhead Lamp', status: 'NOT_OK', selectedReasons: ['BULB BLOWN'], issueId: 'iss-today-02' }
          ]
        },
        'item-lc-kitchen': {
          itemId: 'item-lc-kitchen',
          itemName: 'Kitchen',
          areaId: 'area-lucky-cat',
          areaName: 'LUCKY CAT',
          overallStatus: 'NOT_READY',
          criterionResults: [
            { criterionId: 'crit-lc-kit-clean', criterionName: 'Cleanliness', status: 'NOT_OK', selectedReasons: ['GREASY FLOOR'], issueId: 'iss-today-03' }
          ]
        },
        'item-lc-bar': {
          itemId: 'item-lc-bar',
          itemName: 'Bar',
          areaId: 'area-lucky-cat',
          areaName: 'LUCKY CAT',
          overallStatus: 'NOT_READY',
          criterionResults: [
            { criterionId: 'crit-lc-bar-clean', criterionName: 'Cleanliness', status: 'NOT_OK', selectedReasons: ['STICKY MATS'], issueId: 'iss-today-04' }
          ]
        }
      }
    },
    {
      id: `INSP-${dateYestStr}`,
      date: dateYestStr,
      startedAt: `${dateYestStr}T15:00:00.000Z`,
      startedByName: 'General Manager',
      startedByRole: 'MANAGER',
      completedAt: `${dateYestStr}T15:50:00.000Z`,
      completedByName: 'General Manager',
      isCompleted: true,
      handedOverAt: `${dateYestStr}T15:55:00.000Z`,
      handedOverByName: 'General Manager',
      isHandedOver: true,
      totalItems: 43,
      readyItems: 42,
      notReadyItems: 1,
      naItems: 0,
      totalIssuesCount: 1,
      itemResults: {}
    },
    {
      id: `INSP-${date2DaysAgoStr}`,
      date: date2DaysAgoStr,
      startedAt: `${date2DaysAgoStr}T15:10:00.000Z`,
      startedByName: 'General Manager',
      startedByRole: 'MANAGER',
      completedAt: `${date2DaysAgoStr}T16:00:00.000Z`,
      completedByName: 'General Manager',
      isCompleted: true,
      handedOverAt: `${date2DaysAgoStr}T16:05:00.000Z`,
      handedOverByName: 'General Manager',
      isHandedOver: true,
      totalItems: 43,
      readyItems: 42,
      notReadyItems: 1,
      naItems: 0,
      totalIssuesCount: 1,
      itemResults: {}
    }
  ];

  const sampleTasks: DailyTask[] = [
    {
      id: `task-${dateTodayStr}-01`,
      date: dateTodayStr,
      title: 'Check Lucky Cat billiard staff schedule',
      notes: 'Make sure table attendants for tonight are confirmed.',
      priority: 'IMPORTANT',
      status: 'PENDING',
      createdByUserId: 'user-manager',
      createdByName: 'General Manager',
      createdAt: `${dateTodayStr}T14:30:00.000Z`,
      updatedAt: `${dateTodayStr}T14:30:00.000Z`,
      history: [
        {
          id: `log-task-01-1`,
          timestamp: `${dateTodayStr}T14:30:00.000Z`,
          action: 'CREATED',
          performedByUserId: 'user-manager',
          performedByName: 'General Manager',
          performedByRole: 'MANAGER',
          notes: 'Task created: Check Lucky Cat billiard staff schedule'
        }
      ]
    },
    {
      id: `task-${dateTodayStr}-02`,
      date: dateTodayStr,
      title: "Confirm tomorrow's JPE KTV VIP booking",
      notes: 'Room 312 setup with champagne glassware requested.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdByUserId: 'user-manager',
      createdByName: 'General Manager',
      createdAt: `${dateTodayStr}T14:40:00.000Z`,
      updatedAt: `${dateTodayStr}T15:15:00.000Z`,
      startedAt: `${dateTodayStr}T15:15:00.000Z`,
      startedByUserId: 'user-asst-manager',
      startedByName: 'Assistant Manager',
      history: [
        {
          id: `log-task-02-1`,
          timestamp: `${dateTodayStr}T14:40:00.000Z`,
          action: 'CREATED',
          performedByUserId: 'user-manager',
          performedByName: 'General Manager',
          performedByRole: 'MANAGER',
          notes: "Task created: Confirm tomorrow's JPE KTV VIP booking"
        },
        {
          id: `log-task-02-2`,
          timestamp: `${dateTodayStr}T15:15:00.000Z`,
          action: 'STARTED',
          performedByUserId: 'user-asst-manager',
          performedByName: 'Assistant Manager',
          performedByRole: 'ASSISTANT_MANAGER',
          notes: 'Task started by Assistant Manager'
        }
      ]
    },
    {
      id: `task-${dateTodayStr}-03`,
      date: dateTodayStr,
      title: 'Audit POS printer paper stock in Bar & Cashier',
      notes: 'Check backup rolls under counter.',
      priority: 'NORMAL',
      status: 'DONE',
      createdByUserId: 'user-manager',
      createdByName: 'General Manager',
      createdAt: `${dateTodayStr}T14:45:00.000Z`,
      updatedAt: `${dateTodayStr}T16:00:00.000Z`,
      startedAt: `${dateTodayStr}T15:30:00.000Z`,
      startedByUserId: 'user-asst-manager',
      startedByName: 'Assistant Manager',
      completedAt: `${dateTodayStr}T16:00:00.000Z`,
      completedByUserId: 'user-asst-manager',
      completedByName: 'Assistant Manager',
      completionNote: 'All POS stations restocked with spare rolls.',
      history: [
        {
          id: `log-task-03-1`,
          timestamp: `${dateTodayStr}T14:45:00.000Z`,
          action: 'CREATED',
          performedByUserId: 'user-manager',
          performedByName: 'General Manager',
          performedByRole: 'MANAGER'
        },
        {
          id: `log-task-03-2`,
          timestamp: `${dateTodayStr}T16:00:00.000Z`,
          action: 'MARKED_DONE',
          performedByUserId: 'user-asst-manager',
          performedByName: 'Assistant Manager',
          performedByRole: 'ASSISTANT_MANAGER',
          notes: 'Completed: All POS stations restocked'
        }
      ]
    },
    {
      id: `task-${dateYestStr}-01`,
      date: dateYestStr,
      title: 'Inspect Sound System in KTV Room 302',
      notes: 'Guest reported minor audio hum earlier this week.',
      priority: 'IMPORTANT',
      status: 'DONE',
      createdByUserId: 'user-manager',
      createdByName: 'General Manager',
      createdAt: `${dateYestStr}T15:00:00.000Z`,
      updatedAt: `${dateYestStr}T17:30:00.000Z`,
      completedAt: `${dateYestStr}T17:30:00.000Z`,
      completedByUserId: 'user-asst-manager',
      completedByName: 'Assistant Manager',
      completionNote: 'Replaced grounding XLR cable on channel 2. Noise resolved.',
      history: []
    }
  ];

  return { inspections, issues: sampleIssues, tasks: sampleTasks, notes: sampleNotes };
}
