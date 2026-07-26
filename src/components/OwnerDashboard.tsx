import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, Users, FileText, DollarSign, Plus, Download, Filter, 
  Trash2, UserPlus, Key, Receipt, Check, AlertCircle, Bookmark, Sparkles, 
  Home, FileCheck, ClipboardList, Crown, Landmark, ShieldAlert, BadgeCheck, Phone,
  LogOut, Search, FileDown, FileSpreadsheet, Settings, MapPin, CheckCircle
} from 'lucide-react';
import { User, Property, Tenant, Allocation, Invoice, Transaction, ActivityLog } from '../types';
import SettingsModal from './SettingsModal';
import { formatTitleCaseName } from '../lib/api';

const currencies = [
  { symbol: '₹', code: 'INR', name: 'Rupees (₹)' },
  { symbol: '$', code: 'USD', name: 'Dollars ($)' },
  { symbol: '€', code: 'EUR', name: 'Euros (€)' },
  { symbol: '£', code: 'GBP', name: 'Pounds (£)' },
  { symbol: '¥', code: 'JPY/CNY', name: 'Yen/Yuan (¥)' },
  { symbol: 'د.إ', code: 'AED', name: 'Dirham (د.إ)' },
  { symbol: 'SR', code: 'SAR', name: 'Riyal (SR)' }
];

const countryCodes = [
  { code: '+91', country: 'IN', name: 'India (+91)' },
  { code: '+1', country: 'US', name: 'USA (+1)' },
  { code: '+44', country: 'GB', name: 'UK (+44)' },
  { code: '+61', country: 'AU', name: 'Australia (+61)' },
  { code: '+49', country: 'DE', name: 'Germany (+49)' },
  { code: '+971', country: 'AE', name: 'UAE (+971)' },
  { code: '+65', country: 'SG', name: 'Singapore (+65)' },
  { code: '+33', country: 'FR', name: 'France (+33)' },
  { code: '+81', country: 'JP', name: 'Japan (+81)' },
  { code: '+966', country: 'SA', name: 'Saudi Arabia (+966)' }
];

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const phoneValidationRules: Record<string, { country: string; expected: string; regex: RegExp; startCheck?: (digits: string) => boolean; startDesc?: string }> = {
  '+91': {
    country: 'India',
    expected: 'exactly 10 digits',
    regex: /^\d{10}$/,
    startCheck: (d) => /^[6-9]/.test(d),
    startDesc: '6, 7, 8, or 9'
  },
  '+1': {
    country: 'USA',
    expected: 'exactly 10 digits',
    regex: /^\d{10}$/,
    startCheck: (d) => /^[2-9]/.test(d),
    startDesc: '2 to 9'
  },
  '+44': {
    country: 'UK',
    expected: '9 to 11 digits',
    regex: /^\d{9,11}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+61': {
    country: 'Australia',
    expected: '9 digits',
    regex: /^\d{9}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+49': {
    country: 'Germany',
    expected: '10 to 12 digits',
    regex: /^\d{10,12}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+971': {
    country: 'UAE',
    expected: '8 to 9 digits',
    regex: /^\d{8,9}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+65': {
    country: 'Singapore',
    expected: 'exactly 8 digits',
    regex: /^\d{8}$/,
    startCheck: (d) => /^[3689]/.test(d),
    startDesc: '3, 6, 8, or 9'
  },
  '+33': {
    country: 'France',
    expected: 'exactly 9 digits',
    regex: /^\d{9}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+81': {
    country: 'Japan',
    expected: '9 to 10 digits',
    regex: /^\d{9,10}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+966': {
    country: 'Saudi Arabia',
    expected: 'exactly 9 digits',
    regex: /^\d{9}$/,
    startCheck: (d) => /^5/.test(d),
    startDesc: '5'
  }
};

const validateCountryPhone = (phone: string, countryCode: string): ValidationResult => {
  const digits = phone.replace(/[\s()-]/g, '');
  
  if (!digits) {
    return { isValid: false, error: 'Phone number cannot be empty.' };
  }

  if (!/^\d+$/.test(digits)) {
    return { isValid: false, error: 'Phone number must contain only digits.' };
  }

  const rule = phoneValidationRules[countryCode];
  if (!rule) {
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, error: 'Phone number must be between 7 and 15 digits.' };
    }
    return { isValid: true };
  }

  if (!rule.regex.test(digits)) {
    return { 
      isValid: false, 
      error: `${rule.country} phone number must be ${rule.expected}. Current length: ${digits.length}.` 
    };
  }

  if (rule.startCheck && !rule.startCheck(digits)) {
    return { 
      isValid: false, 
      error: `${rule.country} phone numbers must start with ${rule.startDesc}.` 
    };
  }

  return { isValid: true };
};

const getShortLocation = (location: string | undefined) => {
  if (!location) return 'Location Unspecified';
  return location.trim();
};

const COUNTRIES_LIST = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Germany',
  'Japan',
  'France',
  'Saudi Arabia',
  'Italy',
  'Spain',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Brazil',
  'South Africa',
  'New Zealand',
  'Malaysia',
  'Mexico',
  'China',
  'Russia',
  'South Korea',
  'Indonesia',
  'Thailand',
  'Turkey',
  'Egypt',
  'Argentina',
  'Vietnam',
  'Poland',
  'Philippines',
  'Bangladesh',
  'Nepal',
  'Sri Lanka',
  'Nigeria',
  'Kenya',
  'Colombia',
  'Chile',
  'Peru',
  'Denmark',
  'Norway',
  'Finland',
  'Ireland',
  'Austria',
  'Belgium',
  'Portugal',
  'Greece',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Armenia',
  'Azerbaijan',
  'Bahamas',
  'Barbados',
  'Belarus',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brunei',
  'Bulgaria',
  'Cambodia',
  'Cameroon',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Ecuador',
  'Estonia',
  'Ethiopia',
  'Fiji',
  'Georgia',
  'Ghana',
  'Guatemala',
  'Hungary',
  'Iceland',
  'Iran',
  'Iraq',
  'Israel',
  'Jamaica',
  'Jordan',
  'Kazakhstan',
  'Latvia',
  'Lebanon',
  'Lithuania',
  'Luxembourg',
  'Maldives',
  'Malta',
  'Mauritius',
  'Monaco',
  'Mongolia',
  'Morocco',
  'Myanmar',
  'Namibia',
  'Nicaragua',
  'Pakistan',
  'Panama',
  'Paraguay',
  'Romania',
  'Rwanda',
  'Serbia',
  'Slovakia',
  'Slovenia',
  'Tanzania',
  'Tunisia',
  'Uganda',
  'Ukraine',
  'Uruguay',
  'Uzbekistan',
  'Venezuela',
  'Zimbabwe'
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  'India': [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ],
  'United States': [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana',
    'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
    'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
  ],
  'United Kingdom': [
    'Greater London', 'Scotland', 'Wales', 'Northern Ireland', 'West Midlands',
    'Greater Manchester', 'Yorkshire', 'East Midlands', 'East of England', 'South East',
    'South West', 'North East', 'North West'
  ],
  'Canada': [
    'Ontario', 'British Columbia', 'Quebec', 'Alberta', 'Manitoba', 'Nova Scotia',
    'Saskatchewan', 'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island',
    'Northwest Territories', 'Nunavut', 'Yukon'
  ],
  'Australia': [
    'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia',
    'Tasmania', 'Australian Capital Territory', 'Northern Territory'
  ],
  'United Arab Emirates': [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'
  ],
  'Germany': [
    'Bavaria', 'Berlin', 'Baden-Württemberg', 'North Rhine-Westphalia', 'Hesse', 'Saxony', 'Lower Saxony', 'Hamburg'
  ],
  'Japan': [
    'Tokyo', 'Osaka', 'Kanagawa', 'Aichi', 'Hokkaido', 'Fukuoka', 'Kyoto', 'Hyogo'
  ],
  'France': [
    'Île-de-France', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur', 'Nouvelle-Aquitaine', 'Occitanie'
  ],
  'Saudi Arabia': [
    'Riyadh Region', 'Makkah Region', 'Eastern Province', 'Madinah Region', 'Asir Region'
  ]
};

const CITIES_BY_STATE: Record<string, string[]> = {
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur', 'Nagaon', 'Tinsukia', 'Bongaigaon', 'Dhubri', 'Sivasagar', 'Goalpara', 'Karimganj', 'Hailakandi', 'Diphu', 'North Lakhimpur', 'Golaghat'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Chhatrapati Sambhajinagar', 'Solapur', 'Navi Mumbai', 'Kohlapur', 'Amravati', 'Nanded', 'Jalgaon', 'Akola', 'Panvel'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'North West Delhi', 'South West Delhi', 'North East Delhi', 'South East Delhi', 'Shahdara'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi-Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari', 'Shivamogga', 'Tumakuru', 'Davangere'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thanjavur', 'Tuticorin'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Kharagpur', 'Bardhaman', 'Malda', 'Baharampur', 'Jalpaiguri'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar', 'Jamnagar', 'Junagadh', 'Anand', 'Navsari'],
  'Uttar Pradesh': ['Noida', 'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Ghaziabad', 'Prayagraj', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur'],
  'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Kottayam', 'Palakkad'],
  'Rajasthan': ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Bikaner', 'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar'],
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Fresno', 'Oakland', 'Long Beach', 'Irvine'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse', 'Yonkers', 'New Rochelle'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg'],
  'Greater London': ['Central London', 'City of London', 'Westminster', 'Kensington & Chelsea', 'Camden', 'Greenwich', 'Islington', 'Hackney', 'Croydon', 'Ealing'],
  'Dubai': ['Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Jumeirah Lakes Towers (JLT)', 'Palm Jumeirah', 'Dubai Hills Estate', 'Jumeirah Village Circle (JVC)', 'Deira', 'Bur Dubai']
};

const DISTRICTS_BY_CITY: Record<string, string[]> = {
  'Guwahati': ['Kamrup Metropolitan', 'Dispur Sub-Division', 'Paltan Bazaar Zone', 'Zoo Road Sector', 'Guwahati Central', 'Jalukbari Sub-District', 'Azara Circle', 'Chandrapur Sector'],
  'Silchar': ['Cachar Central District', 'Tarapur Sub-Division', 'Lakhipur Circle', 'Meherpur Sector', 'Sonai Sub-District'],
  'Dibrugarh': ['Dibrugarh Central District', 'Moran Circle', 'Tingkhong Zone', 'University Sector', 'Chabua Sub-District'],
  'Jorhat': ['Jorhat Central District', 'Titabar Sub-Division', 'Majuli Boundary Zone', 'Teok Sector'],
  'Tezpur': ['Sonitpur Central District', 'Rangapara Circle', 'Bishwanath Sub-Division', 'Dhekiajuli Sector'],
  'Mumbai': ['Mumbai City District', 'Mumbai Suburban District', 'Bandra Sub-Division', 'Andheri West Sector', 'Fort Business District', 'Worli Seaface Sector', 'Powai Lake Zone'],
  'Pune': ['Pune City District', 'Haveli Sub-Division', 'Kothrud Sector', 'Hinjawadi IT Corridor', 'Viman Nagar Sub-Division', 'Baner Sector'],
  'Bengaluru': ['Bengaluru Urban District', 'Indiranagar Sector', 'Koramangala Zone', 'Whitefield IT Sub-Division', 'Electronic City Sector', 'HSR Layout Sector', 'Jayanagar District'],
  'New Delhi': ['Central Delhi District', 'Chanakyapuri Zone', 'Connaught Place Sub-Division', 'Vasant Kunj Sector', 'Saket Sub-District', 'Dwarka Sector'],
  'Kolkata': ['Kolkata Municipal District', 'Howrah Central', 'Salt Lake IT Zone', 'New Town Sector', 'Alipore District', 'Ballygunge Zone']
};

const PINCODES_BY_CITY: Record<string, string[]> = {
  'Guwahati': ['781001 (Paltan Bazaar)', '781003 (Silpukhuri)', '781005 (Dispur)', '781006 (Ganeshguri)', '781022 (Zoo Road)', '781014 (Jalukbari)', '781017 (Azara)', '781028 (Khanapara)'],
  'Silchar': ['788001 (Main Town)', '788005 (Silchar NIT)', '788015 (Meherpur)', '788003 (Tarapur)'],
  'Dibrugarh': ['786001 (Dibrugarh Town)', '786003 (University Campus)', '786004 (Lahoal)'],
  'Jorhat': ['785001 (Jorhat Main)', '785004 (Engineering College)', '785006 (Rowriah)'],
  'Tezpur': ['784001 (Tezpur Town)', '784028 (University Campus)', '784501 (Dhekiajuli)'],
  'Mumbai': ['400001 (Fort)', '400050 (Bandra West)', '400053 (Andheri West)', '400076 (Powai)', '400018 (Worli)', '400002 (Kalbadevi)', '400069 (Andheri East)'],
  'Pune': ['411001 (Pune Station)', '411038 (Kothrud)', '411057 (Hinjawadi)', '411014 (Viman Nagar)', '411045 (Baner)'],
  'Bengaluru': ['560001 (MG Road)', '560034 (Koramangala)', '560038 (Indiranagar)', '560066 (Whitefield)', '560102 (HSR Layout)'],
  'New Delhi': ['110001 (Connaught Place)', '110021 (Chanakyapuri)', '110070 (Vasant Kunj)', '110017 (Saket)', '110075 (Dwarka)'],
  'Kolkata': ['700001 (BBD Bagh)', '700091 (Salt Lake)', '700156 (New Town)', '700027 (Alipore)', '700019 (Ballygunge)']
};

const TENANT_AMENITIES = [
  'High-Speed Wi-Fi',
  'Dedicated Vehicle Parking',
  'Easy Transport / Public Commute',
  'Nearby School / College / University',
  '24/7 Power Backup',
  'Elevator / Lift Access',
  'Gated Security & CCTV Surveillance',
  'Air Conditioning (AC)',
  'In-Unit Laundry / Washing Machine Space',
  'Nearby Hospital & Medical Facilities',
  '24/7 Water Supply',
  'Pet Friendly'
];

const getStatesForCountry = (country: string): string[] => {
  return STATES_BY_COUNTRY[country] || ['Central State', 'Northern Province', 'Southern State', 'Eastern Region', 'Western Province'];
};

const getCitiesForState = (state: string): string[] => {
  return CITIES_BY_STATE[state] || ['Central City', 'Metro Hub', 'North Town', 'South City', 'East Urban Sector', 'West Sector'];
};

const getDistrictsForCity = (city: string): string[] => {
  return DISTRICTS_BY_CITY[city] || [`${city} Central District`, `${city} North Zone`, `${city} South Sector`, `${city} East Sub-Division`];
};

const getPincodesForCity = (city: string): string[] => {
  return PINCODES_BY_CITY[city] || ['781001', '400001', '110001', '560001', '700001', '600001', '90001', 'SW1A 1AA'];
};

interface OwnerDashboardProps {
  ownerUser: User;
  properties: Property[];
  tenants: Tenant[];
  allocations: Allocation[];
  invoices: Invoice[];
  transactions: Transaction[];
  logs: ActivityLog[];
  onAddProperty: (property: Omit<Property, 'id' | 'ownerId' | 'status'>) => void;
  onUpdateProperty?: (property: Property) => void;
  onDeleteProperty?: (propertyId: string) => void;
  onAddTenant: (tenant: Omit<Tenant, 'id' | 'ownerId' | 'status' | 'joinedAt'>) => void;
  onUpdateTenant?: (tenant: Tenant) => void;
  onDeleteTenant?: (tenantId: string) => void;
  onAllocateTenant: (propertyId: string, tenantId: string, roomNo: string, rentOverride?: number) => void;
  onUpdateAllocation?: (allocationId: string, updates: Partial<Allocation>) => void;
  onGenerateMonthlyInvoices: (month: string) => Promise<number> | number;
  onRecordPayment: (invoiceId: string, referenceNo: string) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'ownerId'>) => void;
  onLogOut: () => void;
  onAddLog: (action: string, details: string) => void;
  onUpdateProfile?: (updatedUser: User) => void;
}

export default function OwnerDashboard({
  ownerUser,
  properties,
  tenants,
  allocations,
  invoices,
  transactions,
  logs,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onAddTenant,
  onUpdateTenant,
  onDeleteTenant,
  onAllocateTenant,
  onUpdateAllocation,
  onGenerateMonthlyInvoices,
  onRecordPayment,
  onAddTransaction,
  onLogOut,
  onAddLog,
  onUpdateProfile
}: OwnerDashboardProps) {
  
  const [activeTab, setActiveTab] = useState<'kpis' | 'properties' | 'tenants' | 'transactions' | 'invoices'>('kpis');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Confirmation state for Owner Actions
  const [ownerConfirmAction, setOwnerConfirmAction] = useState<{
    type: 'add_property' | 'add_tenant' | 'allocate_tenant' | 'generate_invoices' | 'record_payment' | 'add_transaction' | 'logout';
    payload?: any;
    title: string;
    description: string;
  } | null>(null);

  const handleExecuteOwnerAction = async () => {
    if (!ownerConfirmAction) return;

    const { type, payload } = ownerConfirmAction;

    if (type === 'add_property') {
      executeAddProperty(payload);
    } else if (type === 'add_tenant') {
      executeAddTenant(payload);
    } else if (type === 'allocate_tenant') {
      executeAllocateTenant(payload);
    } else if (type === 'generate_invoices') {
      await executeGenerateInvoices(payload);
    } else if (type === 'record_payment') {
      executeRecordPayment(payload);
    } else if (type === 'add_transaction') {
      executeAddTransaction(payload);
    } else if (type === 'logout') {
      onLogOut();
    }

    setOwnerConfirmAction(null);
  };

  const executeAddProperty = (payload: any) => {
    onAddProperty(payload);
    onAddLog('Property Added', `Noble owner created property: "${payload.title}" at ${payload.location}. Rent: $${payload.rent}/mo.`);
    
    // reset property creation form
    setPropTitle('');
    setPropCountry('');
    setPropCountryCustom('');
    setPropState('');
    setPropStateCustom('');
    setPropCityTown('');
    setPropCityTownCustom('');
    setPropDistrict('');
    setPropDistrictCustom('');
    setPropPincode('');
    setPropPincodeCustom('');
    setPropStreetAddress('');
    setPropRooms(3);
    setPropRoomList([
      { name: 'Room 1', rent: 1500, bhk: '1 BHK' },
      { name: 'Room 2', rent: 1500, bhk: '1 BHK' },
      { name: 'Room 3', rent: 1500, bhk: '1 BHK' },
    ]);
    setPropBhk(2);
    setPropRent(1500);
    setPropTerms('');
    setPropAmenities([]);
    setPropDetails('');
    setShowAddProperty(false);
  };

  const executeAddTenant = (payload: any) => {
    onAddTenant(payload);
    onAddLog('Tenant Registered', `Noble owner added minimal details for Tenant: "${payload.name}" (${payload.email}).`);

    // reset
    setTenantName('');
    setTenantEmail('');
    setTenantPhone('');
    setTenantNid('');
    setTenantIdValue('');
    setTenantIdType('Aadhaar Card');
    setShowAddTenant(false);
  };

  const executeAllocateTenant = (payload: any) => {
    onAllocateTenant(payload.propertyId, payload.tenantId, payload.roomNo, payload.rentOverride);
    onAddLog('Tenant Allocated', `Allocated tenant "${payload.tenantName}" to property "${payload.propertyTitle}" in room: "${payload.roomNo}"${payload.rentOverride ? ` (Custom Rent: ${currency}${payload.rentOverride}/mo)` : ''}.`);

    setAllocPropertyId('');
    setAllocTenantId('');
    setAllocRoomNo('');
    setAllocCustomRoomNo('');
    setAllocLeaseTerm('');
    setAllocRentOverride('');
    setShowAllocate(false);
  };

  const executeGenerateInvoices = async (payload: any) => {
    const count = await onGenerateMonthlyInvoices(payload.month);
    
    if (count > 0) {
      onAddLog('Invoices Generated', `Auto-generated ${count} monthly rent invoice(s) for billing period: ${payload.month}.`);
      alert(`Sovereign System successfully generated ${count} invoices for the month of ${payload.month}!`);
    } else {
      alert(`No new allocations require invoicing for ${payload.month}, or invoices are already present.`);
    }
  };

  const executeRecordPayment = (payload: any) => {
    onRecordPayment(payload.invoiceId, payload.referenceNo);
    onAddLog('Rent Paid', `Recorded payment for ${payload.tenantName} on property "${payload.propertyTitle}". Amount: $${payload.amount}. Ref: ${payload.referenceNo}.`);

    setSelectedInvoiceSlip(null);
    setPaymentRefNo('');
  };

  const executeAddTransaction = (payload: any) => {
    onAddTransaction(payload);
    onAddLog('Transaction Logged', `Logged custom financial ${payload.type}: ${payload.category} - Amount: $${payload.amount}.`);

    setTxTenantId('');
    setTxPropertyId('');
    setTxAmount(1000);
    setTxDescription('');
    setTxBillType('Room Rent');
    setTxMonthYear(new Date().toISOString().substring(0, 7));
    setTxAllocationId('');
    setShowAddTx(false);
  };

  // Month filters for KPIs and Invoices
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');

  // Currency & Country Code States
  const [currency, setCurrency] = useState(() => localStorage.getItem('owner_currency') || '₹');
  const [tenantIdType, setTenantIdType] = useState('Aadhaar Card');
  const [tenantIdValue, setTenantIdValue] = useState('');
  const [tenantCountryCode, setTenantCountryCode] = useState('+91');

  // Input states for Add Property
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  
  // Location Hierarchy States (Defaulted to blank "")
  const [propCountry, setPropCountry] = useState('');
  const [propCountryCustom, setPropCountryCustom] = useState('');
  const [propState, setPropState] = useState('');
  const [propStateCustom, setPropStateCustom] = useState('');
  const [propCityTown, setPropCityTown] = useState('');
  const [propCityTownCustom, setPropCityTownCustom] = useState('');
  const [propDistrict, setPropDistrict] = useState('');
  const [propDistrictCustom, setPropDistrictCustom] = useState('');
  const [propPincode, setPropPincode] = useState('');
  const [propPincodeCustom, setPropPincodeCustom] = useState('');
  const [propStreetAddress, setPropStreetAddress] = useState('');

  const [propRooms, setPropRooms] = useState(3);
  const [propRoomList, setPropRoomList] = useState<{ name: string; rent: number; bhk: string }[]>([
    { name: 'Room 1', rent: 1500, bhk: '1 BHK' },
    { name: 'Room 2', rent: 1500, bhk: '1 BHK' },
    { name: 'Room 3', rent: 1500, bhk: '1 BHK' },
  ]);
  const [propBhk, setPropBhk] = useState(2);
  const [propRent, setPropRent] = useState(1500);
  const [propTerms, setPropTerms] = useState('');
  const [propAmenities, setPropAmenities] = useState<string[]>([]);
  const [propDetails, setPropDetails] = useState('');

  // Location Cascading Handlers
  const handleCountryChange = (c: string) => {
    setPropCountry(c);
    setPropCountryCustom('');
    setPropState('');
    setPropStateCustom('');
    setPropCityTown('');
    setPropCityTownCustom('');
    setPropDistrict('');
    setPropDistrictCustom('');
    setPropPincode('');
    setPropPincodeCustom('');
  };

  const handleStateChange = (s: string) => {
    setPropState(s);
    setPropStateCustom('');
    setPropCityTown('');
    setPropCityTownCustom('');
    setPropDistrict('');
    setPropDistrictCustom('');
    setPropPincode('');
    setPropPincodeCustom('');
  };

  const handleCityChange = (ct: string) => {
    setPropCityTown(ct);
    setPropCityTownCustom('');
    setPropDistrict('');
    setPropDistrictCustom('');
    setPropPincode('');
    setPropPincodeCustom('');
  };

  // Dynamic Room List Handler
  const handleRoomsCountChange = (count: number) => {
    const num = Math.max(1, Math.min(100, count));
    setPropRooms(num);
    setPropRoomList((prev) => {
      const updated = [...prev];
      if (num > updated.length) {
        for (let i = updated.length; i < num; i++) {
          const defaultRent = updated.length > 0 ? updated[updated.length - 1].rent : 1500;
          const defaultBhk = updated.length > 0 ? updated[updated.length - 1].bhk : '1 BHK';
          updated.push({ name: `Room ${i + 1}`, rent: defaultRent, bhk: defaultBhk });
        }
      } else if (num < updated.length) {
        updated.splice(num);
      }
      return updated;
    });
  };

  const handleRoomNameChange = (index: number, newName: string) => {
    setPropRoomList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: newName };
      return next;
    });
  };

  const handleRoomRentChange = (index: number, newRent: number) => {
    setPropRoomList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], rent: newRent };
      return next;
    });
  };

  const handleRoomBhkChange = (index: number, newBhk: string) => {
    setPropRoomList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], bhk: newBhk };
      return next;
    });
  };

  // Input states for Add Tenant
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantNid, setTenantNid] = useState('');

  // Allocation state
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocPropertyId, setAllocPropertyId] = useState('');
  const [allocTenantId, setAllocTenantId] = useState('');
  const [allocRoomNo, setAllocRoomNo] = useState('');
  const [allocCustomRoomNo, setAllocCustomRoomNo] = useState('');
  const [allocLeaseTerm, setAllocLeaseTerm] = useState('');
  const [allocRentOverride, setAllocRentOverride] = useState<number | ''>('');

  // Edit Allocation Rent / Room State
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [editAllocRoomNo, setEditAllocRoomNo] = useState<string>('');
  const [editAllocRentOverride, setEditAllocRentOverride] = useState<number | ''>('');

  // Manual Transaction
  const [showAddTx, setShowAddTx] = useState(false);
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txCategory, setTxCategory] = useState('Rent Income');
  const [txAmount, setTxAmount] = useState(1000);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txPropertyId, setTxPropertyId] = useState('');
  const [txTenantId, setTxTenantId] = useState('');

  // Custom utility / billing fields
  const [txBillType, setTxBillType] = useState<'Room Rent' | 'Water Bill' | 'Electricity Bill' | 'Other Bill'>('Room Rent');
  const [txMonthYear, setTxMonthYear] = useState(() => new Date().toISOString().substring(0, 7));
  const [txAllocationId, setTxAllocationId] = useState('');

  // Transactions advanced filtering and sorting states
  const [txFilterType, setTxFilterType] = useState<string>('all');
  const [txFilterCategory, setTxFilterCategory] = useState<string>('all');
  const [txFilterProperty, setTxFilterProperty] = useState<string>('all');
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txSortField, setTxSortField] = useState<'date' | 'amount'>('date');
  const [txSortOrder, setTxSortOrder] = useState<'asc' | 'desc'>('desc');

  // Invoice detailed slip view modal
  const [selectedInvoiceSlip, setSelectedInvoiceSlip] = useState<Invoice | null>(null);
  const [paymentRefNo, setPaymentRefNo] = useState('');

  // Filter lists based on owner id
  const ownerProperties = properties.filter(p => p.ownerId === ownerUser.id);
  const ownerTenants = tenants.filter(t => t.ownerId === ownerUser.id);
  const ownerAllocations = allocations.filter(a => a.ownerId === ownerUser.id);
  const ownerInvoices = invoices.filter(i => i.ownerId === ownerUser.id);
  const ownerTransactions = transactions.filter(t => t.ownerId === ownerUser.id);

  // Computed filtered and sorted transactions
  const filteredAndSortedTransactions = ownerTransactions
    .filter(tx => {
      // 1. Filter by Flow Type
      if (txFilterType !== 'all') {
        if (txFilterType === 'credit' && tx.type !== 'credit') return false;
        if (txFilterType === 'debit' && tx.type !== 'debit') return false;
      }
      
      // 2. Filter by Category
      if (txFilterCategory !== 'all' && tx.category !== txFilterCategory) {
        return false;
      }
      
      // 3. Filter by Asset Location
      if (txFilterProperty !== 'all' && tx.propertyId !== txFilterProperty) {
        return false;
      }
      
      // 4. Filter by Search Query
      if (txSearchQuery.trim() !== '') {
        const query = txSearchQuery.toLowerCase();
        const matchesDesc = (tx.description || '').toLowerCase().includes(query);
        const matchesCategory = (tx.category || '').toLowerCase().includes(query);
        const prop = propertiesMap.get(tx.propertyId);
        const matchesProp = prop ? prop.title.toLowerCase().includes(query) : false;
        return matchesDesc || matchesCategory || matchesProp;
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (txSortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (txSortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      
      return txSortOrder === 'desc' ? -comparison : comparison;
    });

  // Memoized properties map for efficient lookups
  const propertiesMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);

  // Available unique months from invoices for filters
  const uniqueMonths = useMemo(
    () => Array.from(new Set(ownerInvoices.map(i => i.month))).sort(),
    [ownerInvoices]
  );

  // Filter Invoices
  const filteredInvoicesForKpis = ownerInvoices.filter(i => {
    const matchesMonth = selectedMonthFilter === 'All' || i.month === selectedMonthFilter;
    const matchesStatus = selectedStatusFilter === 'All' || i.status === selectedStatusFilter;
    return matchesMonth && matchesStatus;
  });

  // Calculate KPIs based on the filters
  const rentCollected = filteredInvoicesForKpis
    .filter(i => i.status === 'completed')
    .reduce((sum, i) => sum + i.amount, 0);

  const rentOutstanding = filteredInvoicesForKpis
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalInvoicedCount = filteredInvoicesForKpis.length;
  const completedInvoicedCount = filteredInvoicesForKpis.filter(i => i.status === 'completed').length;
  const pendingInvoicedCount = filteredInvoicesForKpis.filter(i => i.status === 'pending').length;

  const totalPossibleOccupancy = ownerProperties.length;
  const occupiedCount = ownerProperties.filter(p => p.status === 'occupied').length;
  const occupancyPercentage = totalPossibleOccupancy > 0 
    ? Math.round((occupiedCount / totalPossibleOccupancy) * 100) 
    : 0;

  // Count properties per location
  const propertyCountsByLocation = ownerProperties.reduce<Record<string, number>>((acc, p) => {
    const loc = getShortLocation(p.location);
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const locationDetails = Object.entries(propertyCountsByLocation)
    .map(([loc, count]) => `${count} in ${loc}`)
    .join(', ');

  // Add royal property template clauses
  const handlePrepopulateTerms = () => {
    setPropTerms(
      "1. Monthly lease rent is strictly payable on or before the 5th working day of each calendar cycle.\n" +
      "2. A security deposit equivalent to 2 months of standard rent must be held by the Noble Landlord.\n" +
      "3. Keeping of exotic pets or carrying out unapproved renovations is strictly prohibited.\n" +
      "4. The Sovereign Tenant agrees to maintain high professional standards, and pay for all in-room utility meters.\n" +
      "5. Breach of these Royal covenants will yield automatic immediate tenancy termination."
    );
  };

  // Create Property
  const handleCreatePropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCountry = propCountry === 'Other' ? propCountryCustom : propCountry;
    const finalState = propState === 'Other' ? propStateCustom : propState;
    const finalCity = propCityTown === 'Other' ? propCityTownCustom : propCityTown;
    const finalDistrict = propDistrict === 'Other' ? propDistrictCustom : propDistrict;
    const finalPincode = propPincode === 'Other' ? propPincodeCustom : propPincode;

    const fullLocation = [propStreetAddress, finalPincode, finalDistrict, finalCity, finalState, finalCountry]
      .map(s => (s || '').trim())
      .filter(Boolean)
      .join(', ');

    const totalCalculatedRent = propRoomList.reduce((sum, r) => sum + (Number(r.rent) || 0), 0);
    const hasInvalidUnits = propRoomList.some(r => !r.name.trim() || !r.bhk || Number(r.rent) <= 0);

    if (!propTitle.trim() || !fullLocation || totalCalculatedRent <= 0 || hasInvalidUnits) {
      alert("Please ensure all mandatory fields are filled out: Property Title, Location, and each Unit's Name, BHK Configuration, and Monthly Rent.");
      return;
    }

    if (!propTerms || !propTerms.trim()) {
      alert("Terms and Conditions are mandatory for property creation. Please fill in or pre-populate the lease clauses.");
      return;
    }

    if (!propAmenities || propAmenities.length === 0) {
      alert("Property Amenities are mandatory. Please select at least one amenity or benefit for tenants.");
      return;
    }

    const roomBreakdownText = propRoomList.map(r => `${r.name} (${r.bhk || '1 BHK'}): ${currency}${r.rent}/mo`).join(', ');
    const amenitiesText = propAmenities.length > 0 ? propAmenities.join(', ') : 'Standard Amenities';
    const fullDetails = `Amenities: [${amenitiesText}] | Units: [${roomBreakdownText}]`;

    setOwnerConfirmAction({
      type: 'add_property',
      title: 'Review & Confirm Property Deed',
      description: `Please review the complete property deed summary below. Without your explicit confirmation, this property will NOT be created into your portfolio.`,
      payload: {
        title: propTitle,
        location: fullLocation,
        streetAddress: propStreetAddress,
        district: finalDistrict,
        cityTown: finalCity,
        state: finalState,
        country: finalCountry,
        pincode: finalPincode,
        rooms: Number(propRooms),
        bhk: Number(propBhk),
        rent: Number(totalCalculatedRent),
        terms: propTerms || "Standard leasing covenants apply.",
        details: fullDetails,
        amenities: propAmenities,
        roomList: propRoomList
      }
    });
  };

  // Create Tenant
  const handleCreateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim() || !tenantEmail.trim() || !tenantPhone.trim() || !tenantCountryCode || !tenantIdType || !tenantIdValue.trim()) {
      alert('Missing Mandatory Fields: Please fill out Full Legal Name, Email, Country Code, Phone Number, Document ID Type, and Document ID Number.');
      return;
    }

    const formattedTenantName = formatTitleCaseName(tenantName);

    // Email live-check
    if (!isValidEmail(tenantEmail)) {
      alert('Invalid Email coordinates format. Please enter a correct email (e.g., test@example.com).');
      return;
    }

    // Phone live-check
    const phoneVal = validateCountryPhone(tenantPhone, tenantCountryCode);
    if (!phoneVal.isValid) {
      alert(phoneVal.error || 'Invalid Phone number format.');
      return;
    }

    const cleanPhone = tenantPhone.trim().replace(/[\s()-]/g, '');
    const finalPhone = `${tenantCountryCode} ${cleanPhone}`;
    const cleanEmail = tenantEmail.toLowerCase().trim();

    // Enforce Requirement 1 & 2: Tenants must be unique globally by phone number & email
    const duplicateTenant = tenants.find(t => {
      const dbEmail = t.email.toLowerCase().trim();
      const dbPhoneClean = t.phone.replace(/[\s()-]/g, '');
      return dbEmail === cleanEmail || dbPhoneClean.endsWith(cleanPhone) || cleanPhone.endsWith(dbPhoneClean);
    });

    if (duplicateTenant) {
      alert(`Restricted Action: A tenant with this email or phone number already exists in the system (associated with owner: "${duplicateTenant.ownerId === ownerUser.id ? 'yourself' : 'another registered owner'}"). Tenant duplications are strictly prohibited!`);
      return;
    }

    const idTypeAndValue = `${tenantIdType}: ${tenantIdValue.trim()}`;

    setOwnerConfirmAction({
      type: 'add_tenant',
      title: 'Confirm Tenant Registry',
      description: `Are you sure you want to register "${formattedTenantName}" (${cleanEmail}) as a tenant under your stewardship?`,
      payload: {
        name: formattedTenantName,
        email: cleanEmail,
        phone: finalPhone,
        nid: idTypeAndValue
      }
    });
  };

  // Create Allocation
  const handleCreateAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomNo = allocRoomNo === 'Other' ? allocCustomRoomNo.trim() : allocRoomNo.trim();
    if (!allocPropertyId || !allocTenantId || !finalRoomNo) return;

    const prop = properties.find(p => p.id === allocPropertyId);
    const ten = tenants.find(t => t.id === allocTenantId);

    // Enforce Requirement 2: Check if this tenant is already allocated in any room across the entire system
    const activeAlloc = allocations.find(a => a.tenantId === allocTenantId && a.active !== false);
    if (activeAlloc) {
      const existingProp = properties.find(p => p.id === activeAlloc.propertyId);
      alert(`Restricted Action: Tenant "${ten?.name}" is already allocated to room "${activeAlloc.roomNo}" under property "${existingProp?.title || 'Another Property'}". A tenant cannot reside in multiple rooms or properties concurrently!`);
      return;
    }

    // Check if this room in this property is already occupied
    const roomOccupied = allocations.find(a => a.propertyId === allocPropertyId && a.roomNo === finalRoomNo && a.active !== false);
    if (roomOccupied) {
      const existingTenant = tenants.find(t => t.id === roomOccupied.tenantId);
      alert(`Restricted Action: Room "${finalRoomNo}" in property "${prop?.title}" is already occupied by tenant "${existingTenant?.name || 'Another Tenant'}". Please choose an available room or vacate the existing occupant!`);
      return;
    }

    const customRent = allocRentOverride !== '' ? Number(allocRentOverride) : undefined;

    setOwnerConfirmAction({
      type: 'allocate_tenant',
      title: 'Confirm Room Lease Allocation',
      description: `Are you sure you want to allocate tenant "${ten?.name}" to room "${finalRoomNo}" in property "${prop?.title}"${customRent ? ` with custom monthly room rent of ${currency}${customRent}` : ''}${allocLeaseTerm ? ` under lease term: "${allocLeaseTerm}"` : ''}? This will mark the property as occupied and initiate billing eligibility.`,
      payload: {
        propertyId: allocPropertyId,
        tenantId: allocTenantId,
        roomNo: finalRoomNo,
        rentOverride: customRent,
        leaseTerm: allocLeaseTerm,
        tenantName: ten?.name,
        propertyTitle: prop?.title
      }
    });
  };

  const handleSaveAllocationEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;
    const finalRent = editAllocRentOverride !== '' ? Number(editAllocRentOverride) : undefined;
    if (onUpdateAllocation) {
      onUpdateAllocation(editingAllocation.id, {
        roomNo: editAllocRoomNo,
        rentOverride: finalRent
      });
      onAddLog('Allocation Updated', `Updated room details for allocation ID: ${editingAllocation.id}. New room: "${editAllocRoomNo}", Rent: ${finalRent ? `${currency}${finalRent}` : 'Property Default'}.`);
    }
    setEditingAllocation(null);
  };

  // Trigger Autogeneration of invoices for a month (e.g., current month)
  const handleTriggerInvoiceGeneration = () => {
    const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g., "2026-07"
    
    setOwnerConfirmAction({
      type: 'generate_invoices',
      title: 'Confirm Invoice Generation',
      description: `Are you sure you want to auto-generate standard monthly rent invoices for all active allocations for the current billing period of ${currentMonthStr}?`,
      payload: {
        month: currentMonthStr
      }
    });
  };

  // Record a payment and change status
  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceSlip || !paymentRefNo) return;

    const ten = tenants.find(t => t.id === selectedInvoiceSlip.tenantId);
    const prop = properties.find(p => p.id === selectedInvoiceSlip.propertyId);

    setOwnerConfirmAction({
      type: 'record_payment',
      title: 'Confirm Payment Settlement',
      description: `Are you sure you want to process and clear payment of ${currency}${selectedInvoiceSlip.amount} for "${prop?.title}" by tenant "${ten?.name}" with Reference: "${paymentRefNo}"?`,
      payload: {
        invoiceId: selectedInvoiceSlip.id,
        referenceNo: paymentRefNo,
        tenantName: ten?.name,
        propertyTitle: prop?.title,
        amount: selectedInvoiceSlip.amount
      }
    });
  };

  // Create Manual Transaction (e.g. tax, maintenance, utility check)
  const handleManualTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalTenantId = txTenantId || undefined;
    let finalPropertyId = txPropertyId || undefined;
    let finalRoomNo = undefined;
    let finalDescription = txDescription;
    let finalCategory = txCategory;

    // If they selected a specific tenant lease allocation for utility / rent bill logging
    if (txAllocationId) {
      const alloc = allocations.find(a => a.id === txAllocationId);
      if (alloc) {
        finalTenantId = alloc.tenantId;
        finalPropertyId = alloc.propertyId;
        finalRoomNo = alloc.roomNo;
        finalCategory = txBillType === 'Room Rent' ? 'Rent Income' : 'Utility';
        
        const tenantNameText = tenants.find(t => t.id === alloc.tenantId)?.name || 'Tenant';
        const propTitleText = properties.find(p => p.id === alloc.propertyId)?.title || 'Property';
        
        finalDescription = `${txBillType} - ${tenantNameText} (${propTitleText} Room ${alloc.roomNo}) for ${txMonthYear}`;
      }
    }

    setOwnerConfirmAction({
      type: 'add_transaction',
      title: 'Confirm Financial Transaction Log',
      description: `Are you sure you want to record this financial entry of ${currency}${txAmount} (${txAllocationId ? txBillType : txCategory} - ${txType})?`,
      payload: {
        tenantId: finalTenantId,
        propertyId: finalPropertyId,
        type: txType,
        category: finalCategory,
        amount: txAmount,
        date: txDate,
        description: finalDescription || `${txCategory} log`,
        billType: txAllocationId ? txBillType : undefined,
        monthYear: txAllocationId ? txMonthYear : undefined,
        roomNo: finalRoomNo
      }
    });
  };

  // Export Financial Reports to CSV for Tax filing
  const handleExportTaxCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Type', 'Category', `Amount (${currency})`, 'Description', 'Reference Code', 'Property Title', 'Tenant Name'];
    const rows = ownerTransactions.map(t => {
      const prop = properties.find(p => p.id === t.propertyId);
      const ten = tenants.find(ten => ten.id === t.tenantId);
      return [
        t.id,
        t.date,
        t.type,
        t.category,
        t.amount,
        t.description,
        t.referenceNo || 'MANUAL-ENTRY',
        prop ? prop.title : 'N/A',
        ten ? ten.name : 'N/A'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `royal_tax_financials_${ownerUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog('CSV Export', `Noble Owner exported tax and financial logs containing ${ownerTransactions.length} records to CSV.`);
  };

  // Export Filtered Transactions to CSV
  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Associated Asset', 'Category', 'Description/Narrative', 'Type', `Amount (${currency})`];
    const rows = filteredAndSortedTransactions.map(tx => {
      const prop = properties.find(p => p.id === tx.propertyId);
      return [
        tx.id,
        tx.date,
        prop ? prop.title : 'General Portfolio',
        tx.category,
        tx.description,
        tx.type === 'credit' ? 'Income' : 'Expense',
        tx.amount
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `noble_transactions_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onAddLog('CSV Export', `Sovereign owner exported ${filteredAndSortedTransactions.length} transaction records to CSV ledger.`);
  };

  // Export Filtered Transactions to PDF Print Form
  const handleExportPDF = () => {
    const totalIncome = filteredAndSortedTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpense = filteredAndSortedTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const netYield = totalIncome - totalExpense;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export the ledger to PDF.");
      return;
    }

    const tableRowsHtml = filteredAndSortedTransactions.map(tx => {
      const prop = properties.find(p => p.id === tx.propertyId);
      const isIncome = tx.type === 'credit';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-family: monospace;">${tx.date}</td>
          <td style="padding: 10px; font-weight: 500;">${prop ? prop.title : 'General Portfolio'}</td>
          <td style="padding: 10px;">${tx.category}</td>
          <td style="padding: 10px; color: #4a5568; font-style: italic;">"${tx.description}"</td>
          <td style="padding: 10px; font-weight: bold; color: ${isIncome ? '#059669' : '#d97706'};">
            ${isIncome ? 'INCOME' : 'EXPENSE'}
          </td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: ${isIncome ? '#059669' : '#1a202c'};">
            ${isIncome ? '+' : '-'}${currency}${tx.amount}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Noble Estate Ledger - Sovereign Report</title>
          <style>
            body {
              font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
              color: #1a202c;
              padding: 40px;
              line-height: 1.5;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px double #d4af37;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #1a202c;
              margin: 0;
            }
            .subtitle {
              font-size: 11px;
              color: #718096;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-top: 5px;
            }
            .kpi-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 35px;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              border-top: 4px solid #d4af37;
              border-radius: 6px;
              padding: 15px;
              background: #f8fafc;
            }
            .kpi-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #718096;
              font-weight: 600;
            }
            .kpi-value {
              font-size: 20px;
              font-weight: bold;
              margin-top: 5px;
            }
            .ledger-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 40px;
            }
            .ledger-table th {
              background: #1a202c;
              color: #ffffff;
              text-align: left;
              padding: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              border: none;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #a0aec0;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="title">Noble Estate Ledger</h1>
              <div class="subtitle">Sovereign Financial Report & Audit Trail</div>
            </div>
            <div style="text-align: right; font-size: 11px; color: #718096;">
              <strong>Owner:</strong> ${ownerUser.name}<br>
              <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
              <strong>Status:</strong> Clear & Sealed
            </div>
          </div>

          <div class="kpi-container">
            <div class="kpi-card">
              <div class="kpi-label">Cumulative Revenue</div>
              <div class="kpi-value" style="color: #059669;">${currency}${totalIncome.toLocaleString()}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Cumulative Expenses</div>
              <div class="kpi-value" style="color: #d97706;">${currency}${totalExpense.toLocaleString()}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Net Yield Balance</div>
              <div class="kpi-value" style="color: ${netYield >= 0 ? '#059669' : '#dc2626'}">${currency}${netYield.toLocaleString()}</div>
            </div>
          </div>

          <table class="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Associated Asset</th>
                <th>Category</th>
                <th>Description Narrative</th>
                <th>Flow</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Sovereign Ledger &bull; Secure Financial Certificate &bull; Confirmed Integrity
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    onAddLog('PDF Export', `Sovereign owner exported ${filteredAndSortedTransactions.length} transaction records to PDF ledger.`);
  };

  return (
    <div className="min-h-screen text-neutral-100 font-sans pb-16 relative">
      
      {/* iOS 26 Liquid Glass Top Header Floating Bar */}
      <header className="sticky top-2 z-40 mx-2 sm:mx-6 my-2 rounded-full liquid-glass border border-white/15 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#d4af37]/30 to-amber-900/40 border border-[#d4af37]/50 flex items-center justify-center shrink-0 shadow-inner">
            <Landmark className="w-4 h-4 sm:w-5 sm:h-5 text-[#f3e5ab]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-md font-sans font-bold tracking-wider text-[#f3e5ab] uppercase flex items-center gap-1.5 flex-wrap">
              {ownerUser.businessName || 'Noble Estate Hub'}
              <span className="text-[9px] tracking-normal font-sans bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 backdrop-blur-md">
                <BadgeCheck className="w-2.5 h-2.5 text-emerald-400" /> VERIFIED OWNER
              </span>
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full liquid-pill-gold mt-0.5 max-w-full overflow-hidden">
              <Crown className="w-3 h-3 text-[#d4af37] animate-pulse shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-widest text-[#f3e5ab] truncate">
                PORTFOLIO OF {ownerUser.name.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Currency Select */}
          <div className="flex items-center gap-1 liquid-pill px-2.5 py-1">
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-semibold uppercase tracking-wider hidden xs:inline">Currency:</span>
            <select
              value={currency}
              onChange={(e) => {
                const val = e.target.value;
                setCurrency(val);
                localStorage.setItem('owner_currency', val);
              }}
              className="bg-transparent text-[#f3e5ab] font-bold text-xs focus:outline-none cursor-pointer outline-none"
              id="owner-currency-select"
            >
              {currencies.map(c => (
                <option key={c.symbol} value={c.symbol} className="bg-[#121218] text-neutral-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full liquid-pill hover:border-[#d4af37]/60 text-xs text-neutral-200 transition-all duration-300 cursor-pointer"
            id="btn-owner-settings"
            title="Account Settings & Security"
          >
            <Settings className="w-3 h-3 text-[#d4af37]" />
            <span className="hidden xs:inline font-medium">Settings</span>
          </button>

          <button 
            onClick={() => setOwnerConfirmAction({
              type: 'logout',
              title: 'Confirm Signet Exit',
              description: 'Are you sure you want to terminate your current session and exit the owner portal?'
            })}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full liquid-pill hover:bg-red-500/20 hover:border-red-500/40 text-xs text-neutral-300 hover:text-red-300 transition-all duration-300"
            id="btn-owner-logout"
          >
            Signet Exit
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Navigation Tabs - Seamless Equal-Width Segmented Control Bar */}
        <div className="flex flex-wrap md:flex-nowrap p-1.5 liquid-glass rounded-2xl md:rounded-full gap-1.5 sm:gap-2 mb-8 shadow-xl border border-white/10 w-full justify-between items-stretch">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold tracking-wider uppercase rounded-xl md:rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-center ${
              activeTab === 'kpis' 
                ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25 font-extrabold' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            id="tab-kpis"
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="truncate">Analytics Hub</span>
          </button>
          
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold tracking-wider uppercase rounded-xl md:rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-center ${
              activeTab === 'properties' 
                ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25 font-extrabold' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            id="tab-properties"
          >
            <Building className="w-4 h-4 shrink-0" />
            <span className="truncate">Properties ({ownerProperties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold tracking-wider uppercase rounded-xl md:rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-center ${
              activeTab === 'tenants' 
                ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25 font-extrabold' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            id="tab-tenants"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Tenants ({ownerTenants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold tracking-wider uppercase rounded-xl md:rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-center ${
              activeTab === 'invoices' 
                ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25 font-extrabold' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            id="tab-invoices"
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span className="truncate">Invoices ({ownerInvoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 text-xs font-bold tracking-wider uppercase rounded-xl md:rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-center ${
              activeTab === 'transactions' 
                ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25 font-extrabold' 
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
            id="tab-transactions"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Transactions ({ownerTransactions.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          
          {/* TAB: KPIS & ANALYTICS */}
          {activeTab === 'kpis' && (
            <motion.div
              key="kpis-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Minimal Filters Panel */}
              <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-md font-display font-semibold text-[#c5a880] tracking-wider uppercase">
                    Portfolio Analytics
                  </h2>
                  <p className="text-[11px] text-neutral-500">Filters dynamically constrain rent outstanding and total revenues.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
                    <Filter className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span className="text-[11px] text-neutral-400">Month:</span>
                    <select
                      value={selectedMonthFilter}
                      onChange={(e) => setSelectedMonthFilter(e.target.value)}
                      className="bg-transparent text-xs text-neutral-200 font-semibold focus:outline-none cursor-pointer"
                      id="select-month-filter"
                    >
                      <option value="All">All Cycles</option>
                      {uniqueMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
                    <span className="text-[11px] text-neutral-400">Payment:</span>
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="bg-transparent text-xs text-neutral-200 font-semibold focus:outline-none cursor-pointer"
                      id="select-status-filter"
                    >
                      <option value="All">All States</option>
                      <option value="completed">Cleared</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Portfolio Property Distribution KPI Card */}
              <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden w-full">
                <div className="absolute top-4 right-4 text-[#d4af37]/20">
                  <Building className="w-6 h-6" />
                </div>
                <p className="text-[11px] font-display uppercase tracking-wider text-[#c5a880]">Total Owned Properties</p>
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 mt-2">
                  <h3 className="text-3xl font-bold font-display text-[#d4af37]">{totalPossibleOccupancy}</h3>
                  {locationDetails ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] text-neutral-500 font-display uppercase tracking-wider">Location Distribution:</span>
                      {Object.entries(propertyCountsByLocation).map(([loc, count]) => (
                        <span key={loc} className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full font-medium">
                          <span className="text-[#d4af37] font-semibold">{count}</span> in {loc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-500">No registered properties in portfolio</p>
                  )}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-emerald-500/20">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-display uppercase tracking-wider text-[#c5a880]">Rent Collected</p>
                  <h3 className="text-3xl font-bold mt-2 font-display text-emerald-400">{currency}{rentCollected.toLocaleString()}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Cleared rent income in filter</p>
                </div>

                <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-red-500/20">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-display uppercase tracking-wider text-red-400">Rent Outstanding</p>
                  <h3 className="text-3xl font-bold mt-2 font-display text-red-400">{currency}{rentOutstanding.toLocaleString()}</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Pending collection in filter</p>
                </div>

                <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-neutral-700">
                    <Building className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-display uppercase tracking-wider text-[#d4af37]">Occupancy Rate</p>
                  <h3 className="text-3xl font-bold mt-2 font-display text-white">{occupancyPercentage}%</h3>
                  <p className="text-[10px] text-neutral-500 mt-1">{occupiedCount} of {totalPossibleOccupancy} Properties let</p>
                </div>

                <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-4 right-4 text-neutral-700">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-display uppercase tracking-wider text-neutral-300">Invoices Breakdown</p>
                  <h3 className="text-xl font-bold mt-3 font-display text-neutral-200">
                    {completedInvoicedCount} Clear / {pendingInvoicedCount} Pend
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1">Total {totalInvoicedCount} invoice records</p>
                </div>

              </div>

              {/* Custom SVG Royal Charts Visual */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Rent Collection Efficiency Visualizer */}
                <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-6 lg:col-span-2">
                  <h3 className="text-xs font-display font-semibold text-[#c5a880] uppercase tracking-widest mb-4">
                    Royal Rent Yield & Efficiency
                  </h3>
                  
                  {rentCollected + rentOutstanding === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-neutral-600 border border-dashed border-neutral-800 rounded">
                      <Bookmark className="w-6 h-6 mb-2 opacity-30" />
                      No invoices found to map metrics for current filter.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Stacked Bar visualization */}
                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-2">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Cleared Collected Rent ({currency}{rentCollected.toLocaleString()})
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            Outstanding Outstanding Rent ({currency}{rentOutstanding.toLocaleString()})
                          </span>
                        </div>
                        
                        {/* Progress line */}
                        <div className="w-full h-4 rounded-full bg-neutral-900 overflow-hidden flex border border-neutral-800">
                          <div 
                            style={{ width: `${(rentCollected / (rentCollected + rentOutstanding)) * 100}%` }} 
                            className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-500"
                          />
                          <div 
                            style={{ width: `${(rentOutstanding / (rentCollected + rentOutstanding)) * 100}%` }} 
                            className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-500"
                          />
                        </div>
                      </div>

                      {/* Collection rate summary */}
                      <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#d4af37]/5 flex items-center justify-center border border-[#d4af37]/20">
                            <Sparkles className="w-5 h-5 text-[#d4af37]" />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-300">Imperial Efficiency Score</p>
                            <p className="text-[11px] text-neutral-500">A higher score ensures fluid estate liquidity.</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xl font-bold font-display text-[#d4af37]">
                            {Math.round((rentCollected / (rentCollected + rentOutstanding)) * 100)}%
                          </p>
                          <p className="text-[10px] text-neutral-500">Collection target reached</p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Properties Occupancy Status Gauge */}
                <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-display font-semibold text-[#c5a880] uppercase tracking-widest mb-4">
                      Sovereign Allocation Gauge
                    </h3>
                    
                    <div className="relative flex items-center justify-center h-28 my-2">
                      {/* Dynamic circular SVG donut */}
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="38"
                          className="stroke-neutral-800"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="38"
                          className="stroke-[#d4af37]"
                          strokeWidth="6"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 38}
                          strokeDashoffset={2 * Math.PI * 38 * (1 - occupancyPercentage / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-bold font-display">{occupiedCount}/{totalPossibleOccupancy}</span>
                        <span className="text-[9px] uppercase tracking-wider text-neutral-500">Occupied</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-neutral-400 space-y-1 mt-4">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#d4af37]" /> Occupied
                      </span>
                      <span className="font-semibold text-neutral-200">{occupiedCount} Properties</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-neutral-800" /> Available Empty
                      </span>
                      <span className="font-semibold text-neutral-200">{totalPossibleOccupancy - occupiedCount} Properties</span>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB: PROPERTIES */}
          {activeTab === 'properties' && (
            <motion.div
              key="properties-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-md font-display font-semibold text-[#c5a880] tracking-wider uppercase">
                    Noble Estate Properties
                  </h2>
                  <p className="text-xs text-neutral-500">Manage rooms, locations, and rent values for your holdings.</p>
                </div>

                <button
                  onClick={() => setShowAddProperty(!showAddProperty)}
                  className="flex items-center gap-1 py-2 px-3 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-semibold text-xs transition-all duration-300"
                  id="btn-add-property"
                >
                  <Plus className="w-4 h-4" /> Add Noble Property
                </button>
              </div>

              {/* Add Property Form Panel */}
              {showAddProperty && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreatePropertySubmit}
                  className="bg-[#121214] border border-[#d4af37]/30 rounded-xl p-5 space-y-4"
                  id="form-add-property"
                >
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1 font-semibold">
                      Property Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={propTitle}
                      onChange={(e) => setPropTitle(e.target.value)}
                      placeholder="e.g. Windsor West Wing Penthouse"
                      className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                    />
                  </div>

                  {/* Address Section: Country -> State -> City/Town -> District -> Pincode -> Street Address */}
                  <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-display uppercase tracking-widest text-[#c5a880] font-semibold">
                        Property Location Hierarchy (Macro to Micro)
                      </p>
                      <span className="text-[9px] text-neutral-500 font-sans">* All 6 location fields are mandatory</span>
                    </div>

                    {/* 1. Country & 2. State */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                          1. Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propCountry}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                          id="select-prop-country"
                        >
                          <option value="">Select an option</option>
                          {COUNTRIES_LIST.map((country) => (
                            <option key={country} value={country} className="bg-neutral-900 text-neutral-200">
                              {country}
                            </option>
                          ))}
                          <option value="Other" className="bg-neutral-900 text-[#d4af37] font-semibold">Other (Type Manually...)</option>
                        </select>
                        {propCountry === 'Other' && (
                          <input
                            type="text"
                            required
                            value={propCountryCustom}
                            onChange={(e) => setPropCountryCustom(e.target.value)}
                            placeholder="Type custom Country name..."
                            className="mt-1.5 block w-full px-3 py-1.5 bg-neutral-950 border border-[#d4af37]/50 rounded text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                          2. State / Province <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propState}
                          onChange={(e) => handleStateChange(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                          id="select-prop-state"
                        >
                          <option value="">Select an option</option>
                          {getStatesForCountry(propCountry).map((st) => (
                            <option key={st} value={st} className="bg-neutral-900 text-neutral-200">
                              {st}
                            </option>
                          ))}
                          <option value="Other" className="bg-neutral-900 text-[#d4af37] font-semibold">Other (Type Manually...)</option>
                        </select>
                        {propState === 'Other' && (
                          <input
                            type="text"
                            required
                            value={propStateCustom}
                            onChange={(e) => setPropStateCustom(e.target.value)}
                            placeholder="Type custom State/Province name..."
                            className="mt-1.5 block w-full px-3 py-1.5 bg-neutral-950 border border-[#d4af37]/50 rounded text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          />
                        )}
                      </div>
                    </div>

                    {/* 3. City / Town & 4. District / Sub-division */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                          3. City / Town <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propCityTown}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                          id="select-prop-city"
                        >
                          <option value="">Select an option</option>
                          {getCitiesForState(propState).map((ct) => (
                            <option key={ct} value={ct} className="bg-neutral-900 text-neutral-200">
                              {ct}
                            </option>
                          ))}
                          <option value="Other" className="bg-neutral-900 text-[#d4af37] font-semibold">Other (Type Manually...)</option>
                        </select>
                        {propCityTown === 'Other' && (
                          <input
                            type="text"
                            required
                            value={propCityTownCustom}
                            onChange={(e) => setPropCityTownCustom(e.target.value)}
                            placeholder="Type custom City/Town name..."
                            className="mt-1.5 block w-full px-3 py-1.5 bg-neutral-950 border border-[#d4af37]/50 rounded text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                          4. District / Sub-division <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propDistrict}
                          onChange={(e) => setPropDistrict(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                          id="select-prop-district"
                        >
                          <option value="">Select an option</option>
                          {getDistrictsForCity(propCityTown).map((dist) => (
                            <option key={dist} value={dist} className="bg-neutral-900 text-neutral-200">
                              {dist}
                            </option>
                          ))}
                          <option value="Other" className="bg-neutral-900 text-[#d4af37] font-semibold">Other (Type Manually...)</option>
                        </select>
                        {propDistrict === 'Other' && (
                          <input
                            type="text"
                            required
                            value={propDistrictCustom}
                            onChange={(e) => setPropDistrictCustom(e.target.value)}
                            placeholder="Type custom District name..."
                            className="mt-1.5 block w-full px-3 py-1.5 bg-neutral-950 border border-[#d4af37]/50 rounded text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          />
                        )}
                      </div>
                    </div>

                    {/* 5. Pincode / Postal Code & 6. Street Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                          5. Pincode / Postal Code <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propPincode}
                          onChange={(e) => setPropPincode(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                          id="select-prop-pincode"
                        >
                          <option value="">Select an option</option>
                          {getPincodesForCity(propCityTown).map((pin) => (
                            <option key={pin} value={pin} className="bg-neutral-900 text-neutral-200">
                              {pin}
                            </option>
                          ))}
                          <option value="Other" className="bg-neutral-900 text-[#d4af37] font-semibold">Other (Type Manually...)</option>
                        </select>
                        {propPincode === 'Other' && (
                          <input
                            type="text"
                            required
                            value={propPincodeCustom}
                            onChange={(e) => setPropPincodeCustom(e.target.value)}
                            placeholder="Type custom Pincode/Postal Code..."
                            className="mt-1.5 block w-full px-3 py-1.5 bg-neutral-950 border border-[#d4af37]/50 rounded text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                          6. Street Address / House No. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={propStreetAddress}
                          onChange={(e) => setPropStreetAddress(e.target.value)}
                          placeholder="e.g. House No. 42, Heritage Avenue, Flat 3B"
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                          id="input-prop-street-address"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-neutral-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1 font-semibold">
                          Total Rental Units <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={propRooms}
                          onChange={(e) => handleRoomsCountChange(Number(e.target.value))}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-semibold cursor-pointer"
                          id="select-total-rental-units"
                        >
                          {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num} className="bg-neutral-900 text-neutral-200">
                              {num} {num === 1 ? 'Unit' : 'Units'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1">Total Monthly Property Rent ({currency})</label>
                        <div className="px-3 py-2 bg-neutral-900/90 border border-[#d4af37]/30 rounded text-[#d4af37] font-bold text-xs flex items-center justify-between">
                          <span>{currency}{propRoomList.reduce((sum, r) => sum + (Number(r.rent) || 0), 0)}</span>
                          <span className="text-[10px] text-neutral-400 font-normal">Sum of unit rents</span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic list of rental units, individual BHK & room rents */}
                    <div className="space-y-2 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] uppercase tracking-wider text-[#c5a880] font-semibold">
                          Individual Unit Configuration & Monthly Rents ({propRoomList.length} Units) <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[10px] text-neutral-500 italic">
                          Configure explicit BHK and rent per unit
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {propRoomList.map((room, idx) => (
                          <div key={idx} className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg space-y-1.5 hover:border-[#d4af37]/30 transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#c5a880] font-medium uppercase tracking-wider">Unit #{idx + 1}</span>
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-neutral-400 mb-0.5 font-medium">
                                Unit / Room Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={room.name}
                                onChange={(e) => handleRoomNameChange(idx, e.target.value)}
                                placeholder={`e.g. Room ${idx + 1}`}
                                className="block w-full px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-neutral-400 mb-0.5 font-medium">
                                Unit BHK Configuration <span className="text-red-500">*</span>
                              </label>
                              <select
                                required
                                value={room.bhk || ''}
                                onChange={(e) => handleRoomBhkChange(idx, e.target.value)}
                                className="block w-full px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer"
                              >
                                <option value="">Select an option</option>
                                <option value="1 RK / Studio">1 RK / Studio</option>
                                <option value="1 BHK">1 BHK</option>
                                <option value="2 BHK">2 BHK</option>
                                <option value="3 BHK">3 BHK</option>
                                <option value="4 BHK">4 BHK</option>
                                <option value="5+ BHK">5+ BHK</option>
                                <option value="Penthouse Suite">Penthouse Suite</option>
                                <option value="Commercial Unit">Commercial Unit</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase tracking-wider text-neutral-400 mb-0.5 font-medium">
                                Monthly Rent ({currency}) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={room.rent || ''}
                                onChange={(e) => handleRoomRentChange(idx, Number(e.target.value))}
                                placeholder="e.g. 1500"
                                className="block w-full px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-[#d4af37] font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs uppercase tracking-wider text-[#c5a880] font-semibold">
                        Terms and Conditions <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handlePrepopulateTerms}
                        className="text-[10px] text-[#d4af37] hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Pre-populate Royal Clauses
                      </button>
                    </div>
                    <textarea
                      required
                      value={propTerms}
                      onChange={(e) => setPropTerms(e.target.value)}
                      rows={3}
                      placeholder="Specify rent deadlines, deposit info, subletting policies..."
                      className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                    />
                  </div>

                  {/* Tenant Amenities Checkboxes */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs uppercase tracking-wider text-[#c5a880] font-semibold">
                        Property Amenities & Benefits for Tenants <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPropAmenities([...TENANT_AMENITIES])}
                          className="text-[10px] text-[#d4af37] hover:underline font-medium px-2 py-0.5 rounded bg-[#d4af37]/10 border border-[#d4af37]/20 transition-all"
                          id="btn-select-all-amenities"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setPropAmenities([])}
                          className="text-[10px] text-neutral-400 hover:text-white hover:underline font-medium px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 transition-all"
                          id="btn-clear-all-amenities"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-neutral-900/80 p-3 rounded-lg border border-neutral-800/80">
                      {TENANT_AMENITIES.map((amenity) => {
                        const isChecked = propAmenities.includes(amenity);
                        return (
                          <label
                            key={amenity}
                            className={`flex items-center gap-2 text-xs p-2 rounded cursor-pointer transition-all border ${
                              isChecked
                                ? 'bg-[#d4af37]/10 border-[#d4af37]/40 text-neutral-100'
                                : 'bg-neutral-900 border-neutral-800/60 text-neutral-400 hover:text-neutral-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPropAmenities([...propAmenities, amenity]);
                                } else {
                                  setPropAmenities(propAmenities.filter((a) => a !== amenity));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-950 text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-neutral-900 cursor-pointer"
                            />
                            <span className="truncate">{amenity}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProperty(false)}
                      className="py-1.5 px-3.5 rounded bg-neutral-900 text-neutral-400 text-xs border border-neutral-800 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-4 rounded bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-semibold text-xs"
                    >
                      Conclude Deed
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Property Portfolio Geographic Spread */}
              {ownerProperties.length > 0 && (
                <div className="bg-[#121214] border border-[#d4af37]/20 rounded-xl p-5 mb-6 shadow-xl flex flex-col md:flex-row gap-6 md:items-stretch justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-[#d4af37]/5 rounded-bl-full pointer-events-none" />
                  
                  <div className="flex flex-col justify-center">
                    <h3 className="text-[10px] font-display uppercase tracking-widest text-[#c5a880] mb-1 font-semibold flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5" /> Total Holdings
                    </h3>
                    <p className="text-4xl font-display font-bold text-neutral-100 mt-1">
                      {ownerProperties.length} <span className="text-sm font-sans text-neutral-500 font-medium">Properties</span>
                    </p>
                  </div>
                  
                  <div className="flex-1 border-t md:border-t-0 md:border-l border-neutral-800/80 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                    <h3 className="text-[10px] font-display uppercase tracking-widest text-neutral-400 mb-3 font-semibold">
                      Geographic Distribution
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {Object.entries(
                        ownerProperties.reduce((acc, prop) => {
                          const shortLoc = getShortLocation(prop.location);
                          acc[shortLoc] = (acc[shortLoc] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([loc, count]) => (
                        <div key={loc} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-lg text-xs transition-colors hover:border-[#d4af37]/40">
                           <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                           <span className="font-bold text-neutral-200">{count}</span>
                           <span className="text-neutral-400">in {loc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Properties Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownerProperties.length === 0 ? (
                  <div className="col-span-full text-center py-16 border border-dashed border-neutral-800 rounded-xl">
                    <Building className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                    <p className="text-sm text-neutral-500">Your sovereign portfolio holds no properties. Begin by clicking Add Noble Property.</p>
                  </div>
                ) : (
                  ownerProperties.map(property => (
                    <div 
                      key={property.id}
                      className="bg-[#121214] border border-neutral-800 rounded-xl overflow-hidden shadow-lg hover:border-[#d4af37]/40 transition-all duration-300 flex flex-col justify-between"
                    >
                      {/* Card Header Banner */}
                      <div className="p-5 border-b border-neutral-800/60 bg-neutral-900/40">
                        {/* Top Badge Meta Row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#d4af37]/15 text-[#f3e5ab] border border-[#d4af37]/30 tracking-wider">
                              {property.rooms} {property.rooms === 1 ? 'Unit' : 'Units'}
                            </span>
                            {property.bhk && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                                {property.bhk}
                              </span>
                            )}
                          </div>

                          {property.status === 'occupied' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              OCCUPIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-950/80 text-amber-300 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              AVAILABLE
                            </span>
                          )}
                        </div>

                        {/* Property Title */}
                        <h3 className="font-display font-bold text-neutral-100 text-base mt-2 tracking-wide leading-snug">
                          {property.title}
                        </h3>

                        {/* Location Box (Selected element formatted with clear location typography) */}
                        <div className="mt-2.5 bg-neutral-950/80 border border-neutral-800/90 rounded-lg p-2.5 flex items-start gap-2 shadow-inner">
                          <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0 mt-0.5" />
                          <div className="text-xs text-neutral-300 leading-relaxed font-sans" title={property.location}>
                            <span className="font-semibold text-neutral-200">Address: </span>
                            {property.location || 'Location Unspecified'}
                          </div>
                        </div>
                      </div>

                      {/* Card Body Details - Focused on Amenities */}
                      <div className="p-5 flex-1 space-y-4">
                        {/* Key Features & Amenities Tags */}
                        {(() => {
                          const propAmenities = (property.amenities && property.amenities.length > 0)
                            ? property.amenities
                            : ['24/7 Security', 'Power Backup', 'Gated Entry', 'Wi-Fi Ready', 'Reserved Parking'];
                          return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-display uppercase tracking-widest text-[#c5a880] font-bold flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Key Features & Amenities
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {propAmenities.map((am, i) => (
                                  <span key={i} className="text-[11px] bg-[#d4af37]/10 text-[#f3e5ab] border border-[#d4af37]/25 px-2.5 py-1 rounded-lg font-medium shadow-sm flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-[#d4af37]" />
                                    {am}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Rooms & Unit Breakdown (Micro Level: Room -> Tenant) */}
                        {property.roomList && property.roomList.length > 0 && (
                          <div className="pt-3 border-t border-neutral-800/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-display uppercase tracking-widest text-[#c5a880] font-bold flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-[#d4af37]" /> Unit Configuration & Status
                              </p>
                              <span className="text-neutral-400 font-mono text-[9px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
                                {property.roomList.length} Units
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {property.roomList.map((rm, idx) => {
                                const roomAlloc = allocations.find(a => a.propertyId === property.id && a.roomNo === rm.name && a.active !== false);
                                const roomTenant = roomAlloc ? tenants.find(t => t.id === roomAlloc.tenantId) : null;
                                return (
                                  <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-all">
                                    <div>
                                      <span className="font-bold text-neutral-100">{rm.name}</span>
                                      {rm.bhk && <span className="ml-1.5 text-[10px] text-neutral-400 font-mono">({rm.bhk})</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[#d4af37] font-extrabold font-mono text-xs">{currency}{rm.rent}</span>
                                      {roomTenant ? (
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-medium truncate max-w-[120px]" title={`Occupied by ${roomTenant.name}`}>
                                          Occupied ({roomTenant.name})
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30 font-medium">
                                          Vacant
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Price & Meta */}
                      <div className="p-4 bg-neutral-900/40 border-t border-neutral-800/60 flex justify-between items-center">
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">Base Monthly Rent</p>
                          <p className="text-xl font-extrabold font-display text-[#d4af37] tracking-tight">
                            {currency}{property.rent}
                            <span className="text-xs font-sans font-normal text-neutral-500 ml-0.5">/mo</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500 font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                            ID: {property.id}
                          </span>
                          {onDeleteProperty && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove property "${property.title}"?`)) {
                                  onDeleteProperty(property.id);
                                }
                              }}
                              className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-950/40 rounded border border-transparent hover:border-red-900/50 transition-all"
                              title="Delete Property"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </motion.div>
          )}

          {/* TAB: TENANTS & ALLOCATIONS */}
          {activeTab === 'tenants' && (
            <motion.div
              key="tenants-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-md font-display font-semibold text-[#c5a880] tracking-wider uppercase">
                    Tenant & Room Allocations
                  </h2>
                  <p className="text-xs text-neutral-500">Log minimal tenant profiles, allocate them to empty rooms, and tie billing parameters.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAddTenant(!showAddTenant)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-[#d4af37]/30 text-xs text-neutral-300 font-semibold transition-all duration-300"
                    id="btn-add-tenant-modal"
                  >
                    <UserPlus className="w-4 h-4 text-[#d4af37]" /> Add Tenant Profile
                  </button>

                  <button
                    onClick={() => setShowAllocate(!showAllocate)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-bold text-xs transition-all duration-300"
                    id="btn-allocate-modal"
                  >
                    <Key className="w-4 h-4" /> Allocate Room
                  </button>
                </div>
              </div>

              {/* Add Tenant profile panel */}
              {showAddTenant && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateTenantSubmit}
                  className="bg-[#121214] border border-[#d4af37]/30 rounded-xl p-5 space-y-4"
                  id="form-add-tenant"
                >
                  <h3 className="text-xs uppercase font-display tracking-wider text-[#d4af37]">Noble Tenant Information Sheet</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
                        Full Legal Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="e.g. Lady Elizabeth Bennett"
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">
                        Email Coordinates <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={tenantEmail}
                        onChange={(e) => setTenantEmail(e.target.value)}
                        placeholder="e.g. elizabeth@pemberley.co.uk"
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-semibold">
                        Secure Contact Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          required
                          value={tenantCountryCode}
                          onChange={(e) => setTenantCountryCode(e.target.value)}
                          className="px-2 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer"
                          id="tenant-country-code-select"
                        >
                          {countryCodes.map(c => (
                            <option key={c.code} value={c.code} className="bg-neutral-900 text-xs">
                              {c.country} ({c.code})
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <input
                            type="text"
                            required
                            value={tenantPhone}
                            onChange={(e) => setTenantPhone(e.target.value)}
                            placeholder="e.g. 9876543210"
                            className={`block w-full px-3 py-2 bg-neutral-900 border ${
                              tenantPhone 
                                ? (validateCountryPhone(tenantPhone, tenantCountryCode).isValid ? 'border-emerald-500/50 focus:ring-emerald-500' : 'border-red-500/50 focus:ring-red-500') 
                                : 'border-neutral-800 focus:ring-[#d4af37]'
                            } rounded text-neutral-200 focus:outline-none focus:ring-1 text-xs`}
                          />
                        </div>
                      </div>
                      {tenantPhone && (
                        <p className={`text-[10px] mt-1 ${
                          validateCountryPhone(tenantPhone, tenantCountryCode).isValid ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {validateCountryPhone(tenantPhone, tenantCountryCode).error || `Valid format for ${phoneValidationRules[tenantCountryCode]?.country || 'selected country'}.`}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-semibold">
                        Verification Document ID <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          required
                          value={tenantIdType}
                          onChange={(e) => setTenantIdType(e.target.value)}
                          className="px-2 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer"
                          id="tenant-id-type-select"
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="PAN Card">PAN Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="Other ID">Other ID</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={tenantIdValue}
                          onChange={(e) => setTenantIdValue(e.target.value)}
                          placeholder="Enter document number"
                          className="block flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                          id="tenant-id-value-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTenant(false)}
                      className="py-1.5 px-3.5 rounded bg-neutral-900 text-neutral-400 text-xs border border-neutral-800 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-4 rounded bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-semibold text-xs"
                    >
                      Save Tenant Profile
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Allocate Room Panel */}
              {showAllocate && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateAllocationSubmit}
                  className="bg-[#121214] border border-[#d4af37]/30 rounded-xl p-5 space-y-4"
                  id="form-allocate"
                >
                  <h3 className="text-xs uppercase font-display tracking-wider text-[#d4af37] font-semibold">The Allocation Registry (Lease Assignment)</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                        1. Property Asset <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={allocPropertyId}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setAllocPropertyId(pId);
                          setAllocRoomNo('');
                          setAllocCustomRoomNo('');
                          const chosenProp = ownerProperties.find(p => p.id === pId);
                          if (chosenProp) {
                            setAllocRentOverride(chosenProp.rent);
                          }
                        }}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                        id="select-allocate-property"
                      >
                        <option value="">Select an option</option>
                        {ownerProperties.map(p => (
                          <option key={p.id} value={p.id}>{p.title} ({currency}{p.rent}/mo)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                        2. Registered Tenant <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={allocTenantId}
                        onChange={(e) => setAllocTenantId(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                        id="select-allocate-tenant"
                      >
                        <option value="">Select a registered tenant</option>
                        {ownerTenants.map(t => {
                          const activeAlloc = allocations.find(a => a.tenantId === t.id && a.active !== false);
                          const isAllocated = !!activeAlloc;
                          const allocatedProp = isAllocated ? properties.find(p => p.id === activeAlloc.propertyId) : null;
                          return (
                            <option 
                              key={t.id} 
                              value={t.id}
                              disabled={isAllocated}
                              className={isAllocated ? "text-neutral-500 bg-neutral-900 font-normal" : "text-neutral-200 bg-neutral-900 font-medium"}
                            >
                              {t.name} ({t.phone}) {isAllocated ? `— [Residing in ${allocatedProp?.title || 'Estate'} - Room ${activeAlloc.roomNo}]` : '— [Unallocated / Ready]'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                        3. Room / Suite <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={allocRoomNo}
                        onChange={(e) => {
                          const selected = e.target.value;
                          setAllocRoomNo(selected);
                          const chosenProp = ownerProperties.find(p => p.id === allocPropertyId);
                          if (chosenProp && chosenProp.roomList) {
                            const matchedRoom = chosenProp.roomList.find(r => r.name === selected);
                            if (matchedRoom) {
                              setAllocRentOverride(matchedRoom.rent);
                            }
                          }
                        }}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                        id="select-allocate-room"
                      >
                        <option value="">Select an option</option>
                        {(() => {
                          const chosenProp = ownerProperties.find(p => p.id === allocPropertyId);
                          if (!chosenProp) {
                            return <option value="" disabled className="text-neutral-500 bg-neutral-900">Select Property First</option>;
                          }
                          const rooms = chosenProp.roomList && chosenProp.roomList.length > 0
                            ? chosenProp.roomList
                            : Array.from({ length: chosenProp.rooms || 1 }, (_, i) => ({ name: `Room ${i+1}`, rent: chosenProp.rent, bhk: `${chosenProp.bhk || 1} BHK` }));
                          
                          return rooms.map(rm => {
                            const existingAlloc = allocations.find(a => a.propertyId === chosenProp.id && a.roomNo === rm.name && a.active !== false);
                            const existingTenant = existingAlloc ? tenants.find(t => t.id === existingAlloc.tenantId) : null;
                            const isOccupied = !!existingAlloc;
                            return (
                              <option 
                                key={rm.name} 
                                value={rm.name}
                                disabled={isOccupied}
                                className={isOccupied ? "text-neutral-500 bg-neutral-900 font-normal" : "text-emerald-400 bg-neutral-900 font-semibold"}
                              >
                                {rm.name} ({rm.bhk ? `${rm.bhk} - ` : ''}{currency}{rm.rent}/mo) {isOccupied ? `— [OCCUPIED by ${existingTenant?.name || 'Tenant'}]` : '— [AVAILABLE]'}
                              </option>
                            );
                          });
                        })()}
                        <option value="Other" className="text-[#d4af37] font-semibold">Other (Type Manually...)</option>
                      </select>
                      {allocRoomNo === 'Other' && (
                        <input
                          type="text"
                          required
                          value={allocCustomRoomNo}
                          onChange={(e) => setAllocCustomRoomNo(e.target.value)}
                          placeholder="Type custom Room / Suite No..."
                          className="mt-1.5 block w-full px-3 py-1.5 bg-neutral-950 border border-[#d4af37]/50 rounded text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                        4. Lease Term <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={allocLeaseTerm}
                        onChange={(e) => setAllocLeaseTerm(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-medium cursor-pointer"
                        id="select-allocate-lease-term"
                      >
                        <option value="">Select an option</option>
                        <option value="11 Months Standard Lease">11 Months Standard Lease</option>
                        <option value="1 Year Fixed Covenant">1 Year Fixed Covenant</option>
                        <option value="2 Years Long Term Lease">2 Years Long Term Lease</option>
                        <option value="6 Months Short Term Lease">6 Months Short Term Lease</option>
                        <option value="Month-to-Month Flex Lease">Month-to-Month Flex Lease</option>
                        <option value="3 Years Sovereign Covenant">3 Years Sovereign Covenant</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1 font-medium">
                        5. Room Rent ({currency}) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={allocRentOverride}
                        onChange={(e) => setAllocRentOverride(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Custom monthly room rent"
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-[#d4af37] font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <p className="text-[11px] text-neutral-500">
                      💡 Owners can assign different rent values and custom lease terms for different rooms in the same property!
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAllocate(false)}
                        className="py-1.5 px-3.5 rounded bg-neutral-900 text-neutral-400 text-xs border border-neutral-800 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-1.5 px-4 rounded bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-semibold text-xs"
                      >
                        Finalize Allocation Lease
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}

              {/* Allocations & Tenants Listings */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Active leases/allocations table */}
                <div className="lg:col-span-2 bg-[#121214] border border-neutral-800 rounded-xl p-6">
                  <h3 className="text-xs font-display font-semibold text-[#c5a880] uppercase tracking-widest mb-4">
                    Active Room Allocations
                  </h3>

                  <div className="overflow-x-auto">
                    {ownerAllocations.length === 0 ? (
                      <div className="text-center py-10 text-neutral-600 border border-dashed border-neutral-800 rounded">
                        No rooms have been allocated yet. Click 'Allocate Room' above.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-neutral-800 text-xs">
                        <thead>
                          <tr className="text-left text-[#c5a880] font-display uppercase tracking-widest">
                            <th className="pb-3">Tenant</th>
                            <th className="pb-3">Noble Asset</th>
                            <th className="pb-3">Room / Suite</th>
                            <th className="pb-3">Room Rent</th>
                            <th className="pb-3">Start Date</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/40 text-neutral-300">
                          {ownerAllocations.map(alloc => {
                            const prop = properties.find(p => p.id === alloc.propertyId);
                            const ten = tenants.find(t => t.id === alloc.tenantId);
                            const actualRent = alloc.rentOverride ?? prop?.rent ?? 0;
                            return (
                              <tr key={alloc.id}>
                                <td className="py-3 font-semibold text-neutral-100">{ten?.name || 'Unknown'}</td>
                                <td className="py-3 max-w-xs truncate text-neutral-400">{prop?.title || 'Unknown Asset'}</td>
                                <td className="py-3 text-neutral-300 font-mono text-[11px]">{alloc.roomNo}</td>
                                <td className="py-3 text-[#d4af37] font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    {currency}{actualRent}/mo
                                    {alloc.rentOverride ? (
                                      <span className="text-[9px] text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded border border-amber-500/20 font-sans font-normal uppercase">
                                        Custom
                                      </span>
                                    ) : null}
                                  </span>
                                </td>
                                <td className="py-3 text-neutral-500">{alloc.startDate}</td>
                                <td className="py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAllocation(alloc);
                                      setEditAllocRoomNo(alloc.roomNo);
                                      setEditAllocRentOverride(alloc.rentOverride ?? prop?.rent ?? '');
                                    }}
                                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-[#d4af37]/40 text-[10px] text-[#c5a880] rounded font-medium transition-all"
                                  >
                                    Edit Rent
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Tenant minimal database list */}
                <div className="bg-[#121214] border border-neutral-800 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-display font-semibold text-[#c5a880] uppercase tracking-widest mb-4">
                      Sovereign Tenants List
                    </h3>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {ownerTenants.length === 0 ? (
                        <p className="text-xs text-neutral-600 text-center py-10">No tenant credentials saved.</p>
                      ) : (
                        ownerTenants.map(t => (
                          <div key={t.id} className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold text-neutral-200 text-xs">{t.name}</p>
                              <span className="text-[9px] uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                                VERIFIED
                              </span>
                            </div>
                            <div className="space-y-0.5 text-[10px] text-neutral-500 font-mono">
                              <p>Email: {t.email}</p>
                              <p>Phone: {t.phone}</p>
                              <p>ID: {t.nid || 'N/A'}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-neutral-800 text-[10px] text-neutral-500">
                    💡 Register tenants first before attempting to execute room occupancy deeds.
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB: RENT INVOICES */}
          {activeTab === 'invoices' && (
            <motion.div
              key="invoices-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-md font-display font-semibold text-[#c5a880] tracking-wider uppercase">
                    Automated Invoices Hub
                  </h2>
                  <p className="text-xs text-neutral-500">Auto-generate invoices for active room allocations, print interactive slips, or record collections.</p>
                </div>

                <button
                  onClick={handleTriggerInvoiceGeneration}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-bold text-xs transition-all duration-300 shadow-md shadow-[#d4af37]/10"
                  id="btn-auto-generate-invoices"
                >
                  <Receipt className="w-4 h-4" /> Auto-Generate Rent Invoices
                </button>
              </div>

              {/* Invoices List table */}
              <div className="bg-[#121214] border border-neutral-800 rounded-xl p-6">
                <div className="overflow-x-auto">
                  {ownerInvoices.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-neutral-800 rounded-xl text-neutral-600">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No invoices logged. Use "Auto-Generate" or allocate rooms to configure invoicing.
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-neutral-800 text-xs">
                      <thead>
                        <tr className="text-left text-[#c5a880] font-display uppercase tracking-widest">
                          <th className="pb-3">Invoice #</th>
                          <th className="pb-3">Noble Tenant</th>
                          <th className="pb-3">Property Location</th>
                          <th className="pb-3">Rent Month</th>
                          <th className="pb-3">Due Date</th>
                          <th className="pb-3">Outstanding</th>
                          <th className="pb-3">State</th>
                          <th className="pb-3 text-right">Invoice Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/40 text-neutral-300">
                        {ownerInvoices.slice().reverse().map(invoice => {
                          const prop = properties.find(p => p.id === invoice.propertyId);
                          const ten = tenants.find(t => t.id === invoice.tenantId);
                          return (
                            <tr key={invoice.id} className="hover:bg-neutral-900/30 transition-colors duration-150">
                              <td className="py-4 font-mono font-semibold text-neutral-100">{invoice.invoiceNumber}</td>
                              <td className="py-4 font-medium text-neutral-200">{ten?.name || 'Unknown Tenant'}</td>
                              <td className="py-4 text-neutral-400 max-w-xs truncate">{prop?.title || 'Unknown Property'}</td>
                              <td className="py-4 font-semibold">{invoice.month}</td>
                              <td className="py-4 text-neutral-500">{invoice.dueDate}</td>
                              <td className="py-4 font-bold text-neutral-200">{currency}{invoice.amount}</td>
                              <td className="py-4">
                                {invoice.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/10">
                                    <Check className="w-2.5 h-2.5" /> PAID
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/40 text-amber-500 border border-amber-500/15">
                                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" /> PENDING
                                  </span>
                                )}
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => setSelectedInvoiceSlip(invoice)}
                                  className="py-1 px-2 rounded bg-neutral-900 border border-neutral-800 hover:border-[#d4af37]/40 text-xs text-neutral-300 font-semibold transition-all duration-300"
                                  id={`btn-view-slip-${invoice.id}`}
                                >
                                  Open slip
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Digital Invoice slip details Modal overlay */}
              {selectedInvoiceSlip && (
                <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#121214] border-2 border-[#d4af37]/30 rounded-2xl max-w-2xl w-full p-6 sm:p-8 text-neutral-200 relative overflow-hidden"
                  >
                    
                    {/* Golden decorative accent */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-neutral-800 pb-5">
                      <div>
                        <h2 className="text-md font-display font-bold tracking-widest text-[#d4af37] uppercase">
                          {ownerUser.businessName || 'SOVEREIGN RENTALS'}
                        </h2>
                        <p className="text-[10px] text-neutral-500 uppercase mt-0.5">Automated Monthly Lease Slip</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded">
                          {selectedInvoiceSlip.invoiceNumber}
                        </span>
                        <p className="text-[10px] text-neutral-500 mt-2">Billing Month: {selectedInvoiceSlip.month}</p>
                      </div>
                    </div>

                    {/* Landlord & Tenant details */}
                    <div className="grid grid-cols-2 gap-6 my-6 text-xs border-b border-neutral-800/40 pb-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#c5a880] mb-1">Estate Holder (Owner)</p>
                        <p className="font-semibold text-neutral-100">{ownerUser.name}</p>
                        <p className="text-neutral-400">{ownerUser.email}</p>
                        <p className="text-neutral-500">{ownerUser.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#c5a880] mb-1">Leasing Sovereign (Tenant)</p>
                        <p className="font-semibold text-neutral-100">
                          {tenants.find(t => t.id === selectedInvoiceSlip.tenantId)?.name || 'Unknown Tenant'}
                        </p>
                        <p className="text-neutral-400">
                          {tenants.find(t => t.id === selectedInvoiceSlip.tenantId)?.email || ''}
                        </p>
                        <p className="text-neutral-500">
                          {tenants.find(t => t.id === selectedInvoiceSlip.tenantId)?.phone || ''}
                        </p>
                      </div>
                    </div>

                    {/* Property breakdown table */}
                    <div className="bg-neutral-900/60 rounded-xl p-4 border border-neutral-800">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Billing Breakdown</p>
                      <div className="text-xs space-y-3">
                        <div className="flex justify-between border-b border-neutral-800/50 pb-2">
                          <div>
                            <p className="font-semibold text-neutral-200">
                              {properties.find(p => p.id === selectedInvoiceSlip.propertyId)?.title || 'Property Lease'}
                            </p>
                            <p className="text-[10px] text-neutral-500">
                              Room Allocation: {allocations.find(a => a.id === selectedInvoiceSlip.allocationId)?.roomNo || 'Suite'}
                            </p>
                          </div>
                          <span className="font-semibold text-neutral-200">
                            {currency}{selectedInvoiceSlip.amount}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-neutral-400 text-[11px]">
                          <span>Cycle Billing Period:</span>
                          <span>{selectedInvoiceSlip.billingPeriod}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400 text-[11px]">
                          <span>Due Deadline:</span>
                          <span className="text-red-400">{selectedInvoiceSlip.dueDate}</span>
                        </div>

                        <div className="flex justify-between text-neutral-200 font-bold border-t border-neutral-800 pt-3 text-sm">
                          <span>TOTAL DUE:</span>
                          <span className="text-[#d4af37]">{currency}{selectedInvoiceSlip.amount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Terms and conditions */}
                    <div className="my-6">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Sovereign Covenants (T&C)</p>
                      <p className="text-[9px] text-neutral-400 leading-relaxed italic bg-neutral-900 p-3 rounded border border-neutral-800/80 whitespace-pre-line">
                        {properties.find(p => p.id === selectedInvoiceSlip.propertyId)?.terms || 'Standard leasing covenants apply.'}
                      </p>
                    </div>

                    {/* State controller / Record payment */}
                    {selectedInvoiceSlip.status === 'pending' ? (
                      <form onSubmit={handleProcessPayment} className="p-4 rounded-xl bg-[#d4af37]/5 border border-[#d4af37]/20 flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] uppercase tracking-wider text-[#c5a880] mb-1 font-semibold">
                            Enter Wire Reference Code to Mark as Paid:
                          </label>
                          <input
                            type="text"
                            required
                            value={paymentRefNo}
                            onChange={(e) => setPaymentRefNo(e.target.value)}
                            placeholder="e.g. WIRE-BANK-890A-112Z"
                            className="block w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                            id="input-payment-ref"
                          />
                        </div>
                        
                        <button
                          type="submit"
                          className="w-full sm:w-auto py-2.5 px-5 rounded-lg bg-[#d4af37] hover:bg-[#c5a880] text-black font-bold text-xs transition-all duration-300 self-end mt-2 sm:mt-0 whitespace-nowrap"
                          id="btn-mark-paid"
                        >
                          Deed Cleared & Paid
                        </button>
                      </form>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-400 font-semibold font-sans">
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4" /> Paid & Settled Invoice Registry
                        </span>
                        <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase">
                          Ref: {selectedInvoiceSlip.paidDate ? `Paid ${selectedInvoiceSlip.paidDate}` : 'Auto-Settled'}
                        </span>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="mt-6 pt-4 border-t border-neutral-800 flex justify-end gap-3">
                      <button
                        onClick={() => window.print()}
                        className="py-1.5 px-3.5 rounded bg-neutral-900 text-neutral-300 text-xs border border-neutral-800 hover:text-white"
                      >
                        Print Slip
                      </button>
                      <button
                        onClick={() => setSelectedInvoiceSlip(null)}
                        className="py-1.5 px-4 rounded bg-gradient-to-r from-neutral-800 to-neutral-700 text-white font-semibold text-xs hover:from-neutral-700"
                        id="btn-close-slip"
                      >
                        Close
                      </button>
                    </div>

                  </motion.div>
                </div>
              )}

            </motion.div>
          )}

          {/* TAB: FINANCIAL AUDIT / TAX TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-md font-display font-semibold text-[#c5a880] tracking-wider uppercase">
                    Financial Audit Logs (Tax Ready)
                  </h2>
                  <p className="text-xs text-neutral-500">Record custom expenses, monitor credits/debits, and export flawless tax filing spreadsheets.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAddTx(!showAddTx)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-[#d4af37]/30 text-xs text-neutral-300 font-semibold transition-all duration-300"
                    id="btn-add-tx-modal"
                  >
                    <Plus className="w-4 h-4 text-[#d4af37]" /> Log Custom Expense
                  </button>

                  <button
                    onClick={handleExportTaxCSV}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/20 font-semibold text-xs transition-all duration-300"
                    id="btn-export-tax-csv"
                  >
                    <Download className="w-4 h-4" /> Export Tax Spreadsheets
                  </button>
                </div>
              </div>

              {/* Add Custom Expense/Credit inline form */}
              {showAddTx && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleManualTransactionSubmit}
                  className="bg-[#121214] border border-[#d4af37]/30 rounded-xl p-5 space-y-4"
                  id="form-add-tx"
                >
                  <div className="flex flex-col pb-2 border-b border-neutral-800 gap-1">
                    <h3 className="text-xs uppercase font-display tracking-wider text-[#d4af37]">Log Custom Financial Transaction</h3>
                    <p className="text-[10px] text-neutral-500">Record rents, utilities, maintenance, or tax items in a single combined form.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1. Lease Association (Optional) */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1 font-semibold">Lease Association (Optional)</label>
                      <select
                        value={txAllocationId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTxAllocationId(val);
                          if (val) {
                            setTxCategory('Rent Income');
                            setTxBillType('Room Rent');
                          }
                        }}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs cursor-pointer"
                      >
                        <option value="">-- General Ledger (No Tenant Association) --</option>
                        {ownerAllocations.map(a => {
                          const ten = tenants.find(t => t.id === a.tenantId);
                          const prop = properties.find(p => p.id === a.propertyId);
                          return (
                            <option key={a.id} value={a.id}>
                              {ten?.name || 'Tenant'} - {prop?.title || 'Property'} (Rm {a.roomNo})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 2. Flow Type */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">Flow Type</label>
                      <select
                        value={txType}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setTxType(val);
                          if (!txAllocationId) {
                            if (val === 'debit') {
                              setTxCategory('Maintenance');
                            } else {
                              setTxCategory('Rent Income');
                            }
                          }
                        }}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs cursor-pointer"
                      >
                        <option value="credit">Credit (Revenue/Income)</option>
                        <option value="debit">Debit (Expense/Outflow)</option>
                      </select>
                    </div>

                    {/* 3. Category selector */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">Financial Category</label>
                      {txAllocationId ? (
                        <select
                          value={txBillType}
                          onChange={(e: any) => setTxBillType(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs cursor-pointer"
                        >
                          <option value="Room Rent">Room Rent</option>
                          <option value="Water Bill">Water Bill</option>
                          <option value="Electricity Bill">Electricity Bill</option>
                          <option value="Other Bill">Other Bill / Utility</option>
                        </select>
                      ) : (
                        <select
                          value={txCategory}
                          onChange={(e) => setTxCategory(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs cursor-pointer"
                        >
                          {txType === 'credit' ? (
                            <>
                              <option value="Rent Income">Rent Income</option>
                              <option value="Deposit Credit">Deposit Credit</option>
                              <option value="Other">Other Income</option>
                            </>
                          ) : (
                            <>
                              <option value="Maintenance">Maintenance & Repair</option>
                              <option value="Tax">Municipal Tax</option>
                              <option value="Utility">Communal Utility</option>
                              <option value="Other">Other Expense</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 4. Date of Record */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">Deed Date</label>
                      <input
                        type="date"
                        required
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                      />
                    </div>

                    {/* 5. Billing Cycle or Associated Property */}
                    <div>
                      {txAllocationId ? (
                        <>
                          <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">Billing Cycle</label>
                          <input
                            type="month"
                            required
                            value={txMonthYear}
                            onChange={(e) => setTxMonthYear(e.target.value)}
                            className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                          />
                        </>
                      ) : (
                        <>
                          <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">Associated Property (Optional)</label>
                          <select
                            value={txPropertyId}
                            onChange={(e) => setTxPropertyId(e.target.value)}
                            className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs cursor-pointer"
                          >
                            <option value="">-- No specific asset associated --</option>
                            {ownerProperties.map(p => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>

                    {/* 6. Transaction Amount */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1 font-semibold">Transaction Amount ({currency})</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={txAmount}
                        onChange={(e) => setTxAmount(Number(e.target.value))}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 7. Associated Tenant (Optional) */}
                    {!txAllocationId && (
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1">Associated Tenant (Optional)</label>
                        <select
                          value={txTenantId}
                          onChange={(e) => setTxTenantId(e.target.value)}
                          className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs cursor-pointer"
                        >
                          <option value="">-- No specific tenant associated --</option>
                          {ownerTenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 8. Description */}
                    <div className={txAllocationId ? "sm:col-span-3" : "sm:col-span-2"}>
                      <label className="block text-xs uppercase tracking-wider text-[#c5a880] mb-1 font-semibold">Narrative / Description</label>
                      <input
                        type="text"
                        required
                        value={txDescription}
                        onChange={(e) => setTxDescription(e.target.value)}
                        placeholder={txAllocationId ? "e.g. Utility payment or room rental invoice" : "e.g. Replaced leaking pressure valve in water system."}
                        className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTx(false)}
                      className="py-1.5 px-3.5 rounded bg-neutral-900 text-neutral-400 text-xs border border-neutral-800 hover:text-white transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-4 rounded bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-semibold text-xs hover:opacity-90 active:scale-95 transition-all duration-150"
                    >
                      Record Financial Flow
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Transactions Log Table */}
              <div className="bg-[#121214] border border-neutral-800 rounded-xl p-6 space-y-4">
                
                {/* Advanced Controls Bar */}
                <div className="flex flex-col gap-4 pb-4 border-b border-neutral-800/80">
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {/* Search Field */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Search ledger details, category, property..."
                        value={txSearchQuery}
                        onChange={(e) => setTxSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all"
                      />
                    </div>

                    {/* Export Actions */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-emerald-500/30 text-xs text-neutral-300 font-semibold hover:text-white transition-all duration-200"
                        id="btn-export-csv"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> CSV Export
                      </button>

                      <button
                        onClick={handleExportPDF}
                        className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-red-500/30 text-xs text-neutral-300 font-semibold hover:text-white transition-all duration-200"
                        id="btn-export-pdf"
                      >
                        <FileDown className="w-3.5 h-3.5 text-red-500" /> PDF Report
                      </button>
                    </div>
                  </div>

                  {/* Filters and sorting Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {/* Flow Filter */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-semibold">Flow Type</label>
                      <select
                        value={txFilterType}
                        onChange={(e) => setTxFilterType(e.target.value)}
                        className="w-full px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      >
                        <option value="all">All Flows</option>
                        <option value="credit">Income Only</option>
                        <option value="debit">Expense Only</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-semibold">Category</label>
                      <select
                        value={txFilterCategory}
                        onChange={(e) => setTxFilterCategory(e.target.value)}
                        className="w-full px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      >
                        <option value="all">All Categories</option>
                        <option value="Rent Income">Rent Income</option>
                        <option value="Deposit Credit">Deposit Credit</option>
                        <option value="Maintenance">Maintenance & Repair</option>
                        <option value="Tax">Municipal Tax</option>
                        <option value="Utility">Utility / Bills</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Property Filter */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-semibold">Asset Location</label>
                      <select
                        value={txFilterProperty}
                        onChange={(e) => setTxFilterProperty(e.target.value)}
                        className="w-full px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      >
                        <option value="all">All Assets</option>
                        {ownerProperties.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Field */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-semibold">Sort By</label>
                      <select
                        value={txSortField}
                        onChange={(e) => setTxSortField(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      >
                        <option value="date">Deed Date</option>
                        <option value="amount">Amount</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1 font-semibold">Order</label>
                      <select
                        value={txSortOrder}
                        onChange={(e) => setTxSortOrder(e.target.value as any)}
                        className="w-full px-2.5 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] cursor-pointer hover:bg-neutral-800/50 transition-colors"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredAndSortedTransactions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl">
                      <Bookmark className="w-8 h-8 mx-auto mb-2 text-neutral-600 opacity-40" />
                      <p className="text-xs text-neutral-500">No ledger streams match your search/filter parameters.</p>
                      {(txSearchQuery || txFilterType !== 'all' || txFilterCategory !== 'all' || txFilterProperty !== 'all') && (
                        <button
                          onClick={() => {
                            setTxSearchQuery('');
                            setTxFilterType('all');
                            setTxFilterCategory('all');
                            setTxFilterProperty('all');
                          }}
                          className="mt-3 px-3 py-1.5 text-[10px] uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-[#d4af37] border border-neutral-800 rounded-lg font-bold transition-all"
                        >
                          Clear Active Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-neutral-800 text-xs">
                      <thead>
                        <tr className="text-left text-[#c5a880] font-display uppercase tracking-widest">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Associated Asset</th>
                          <th className="pb-3">Category</th>
                          <th className="pb-3">Description Narrative</th>
                          <th className="pb-3">Flow</th>
                          <th className="pb-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/40 text-neutral-300">
                        {filteredAndSortedTransactions.map(tx => {
                          const prop = properties.find(p => p.id === tx.propertyId);
                          return (
                            <tr key={tx.id} className="hover:bg-neutral-900/30 transition-colors duration-150">
                              <td className="py-4 font-mono font-semibold text-neutral-500">{tx.date}</td>
                              <td className="py-4 text-neutral-300 font-medium">
                                {prop ? prop.title : 'General Portfolio'}
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                                  tx.category === 'Rent Income' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' :
                                  tx.category === 'Maintenance' ? 'bg-amber-950/40 text-amber-500 border border-amber-500/10' :
                                  'bg-neutral-900 text-neutral-400 border border-neutral-800'
                                }`}>
                                  {tx.category}
                                </span>
                              </td>
                              <td className="py-4 text-neutral-400 max-w-sm truncate italic">
                                "{tx.description}"
                              </td>
                              <td className="py-4">
                                {tx.type === 'credit' ? (
                                  <span className="text-emerald-500 font-bold uppercase text-[10px]">Income</span>
                                ) : (
                                  <span className="text-amber-500 font-bold uppercase text-[10px]">Expense</span>
                                )}
                              </td>
                              <td className={`py-4 text-right font-bold text-sm ${
                                tx.type === 'credit' ? 'text-emerald-400' : 'text-neutral-200'
                              }`}>
                                {tx.type === 'credit' ? '+' : '-'}{currency}{tx.amount}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Informative Tax Note */}
              <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 text-xs text-neutral-400 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#d4af37]/5 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-[#d4af37]" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-[#c5a880] uppercase tracking-wide">
                    Tax Filing Integrity Guard
                  </h4>
                  <p className="leading-relaxed text-neutral-500 text-[11px] mt-1">
                    This module is pre-aligned with international luxury lease tax frameworks. By exporting to CSV, you download audit trails with dedicated columns for rental earnings and maintenance deductions, perfect for rapid file-ready uploads to TurboTax, HR Block, or your private tax accountants.
                  </p>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Edit Room Rent Modal */}
      <AnimatePresence>
        {editingAllocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAllocation(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onSubmit={handleSaveAllocationEdit}
              className="relative bg-[#121214] border border-[#d4af37]/40 rounded-xl max-w-md w-full p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-display font-bold text-[#d4af37] uppercase tracking-wider">
                  Update Room & Rent Terms
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingAllocation(null)}
                  className="text-neutral-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                    Room / Suite Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={editAllocRoomNo}
                    onChange={(e) => setEditAllocRoomNo(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#c5a880] mb-1">
                    Custom Room Rent ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editAllocRentOverride}
                    onChange={(e) => setEditAllocRentOverride(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Enter custom room rent"
                    className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-[#d4af37] font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Set a specific rent amount for this room. Monthly invoices generated for this allocation will use this custom rent amount.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingAllocation(null)}
                  className="py-1.5 px-3.5 rounded bg-neutral-900 text-neutral-400 text-xs border border-neutral-800 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded bg-gradient-to-r from-[#d4af37] to-[#c5a880] text-black font-semibold text-xs"
                >
                  Save Rent Changes
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Royal Owner Confirmation Modal */}
      <AnimatePresence>
        {ownerConfirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOwnerConfirmAction(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className={`relative bg-[#121214] border border-[#d4af37]/30 rounded-xl ${
                ownerConfirmAction.type === 'add_property' ? 'max-w-xl' : 'max-w-md'
              } w-full p-6 text-left shadow-2xl z-10 my-auto max-h-[88vh] flex flex-col`}
            >
              {/* Gold Accent Corner */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-transparent to-[#d4af37]/10 rounded-bl-full pointer-events-none" />

              <div className="flex items-stretch gap-4 flex-1 min-h-0 overflow-hidden">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border self-start ${
                  ownerConfirmAction.type === 'logout' ? 'bg-amber-950/40 border-amber-500/20 text-amber-400' :
                  'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]'
                }`}>
                  {ownerConfirmAction.type === 'logout' && <LogOut className="w-5 h-5" />}
                  {ownerConfirmAction.type === 'add_property' && <Building className="w-5 h-5" />}
                  {ownerConfirmAction.type === 'add_tenant' && <Users className="w-5 h-5" />}
                  {ownerConfirmAction.type === 'allocate_tenant' && <Key className="w-5 h-5" />}
                  {ownerConfirmAction.type === 'generate_invoices' && <Receipt className="w-5 h-5" />}
                  {ownerConfirmAction.type === 'record_payment' && <Check className="w-5 h-5" />}
                  {ownerConfirmAction.type === 'add_transaction' && <DollarSign className="w-5 h-5" />}
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-sm font-display font-bold tracking-wider text-neutral-100 uppercase flex items-center gap-2 shrink-0">
                    {ownerConfirmAction.title}
                    {ownerConfirmAction.type === 'add_property' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] font-semibold">
                        DEED REVIEW
                      </span>
                    )}
                  </h3>

                  <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-3">
                    {ownerConfirmAction.type === 'add_property' && ownerConfirmAction.payload ? (
                      <div className="space-y-3">
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Please review and confirm the property deed details below. Without your explicit confirmation, this property will <span className="text-amber-400 font-semibold">NOT</span> be created into your portfolio.
                        </p>

                        <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-4 space-y-3 text-xs shadow-inner">
                          <div className="flex justify-between items-start border-b border-neutral-800/80 pb-2.5">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-[#c5a880] font-semibold block">Property Title</span>
                              <h4 className="text-sm font-bold text-white font-display mt-0.5">{ownerConfirmAction.payload.title}</h4>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase tracking-wider text-[#c5a880] font-semibold block">Total Monthly Rent</span>
                              <span className="text-sm font-bold text-[#d4af37] font-display mt-0.5 block">{currency}{ownerConfirmAction.payload.rent}/mo</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">Full Address</span>
                            <p className="text-neutral-200 mt-0.5 font-medium">{ownerConfirmAction.payload.location}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">
                              Street: {ownerConfirmAction.payload.streetAddress || 'N/A'} | District: {ownerConfirmAction.payload.district || 'N/A'} | City: {ownerConfirmAction.payload.cityTown || 'N/A'} | Pincode: {ownerConfirmAction.payload.pincode || 'N/A'}
                            </p>
                          </div>

                          <div className="py-2 bg-neutral-950/80 p-2.5 rounded border border-neutral-800/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-neutral-500 uppercase block">Total Rental Units</span>
                              <span className="font-semibold text-[#d4af37] text-xs">{ownerConfirmAction.payload.rooms} Units</span>
                            </div>
                          </div>

                          {/* Individual Unit Breakdown */}
                          {ownerConfirmAction.payload.roomList && ownerConfirmAction.payload.roomList.length > 0 && (
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-[#c5a880] font-semibold block mb-1">
                                Individual Rental Units Breakdown ({ownerConfirmAction.payload.roomList.length} Units)
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 bg-neutral-950 p-2 rounded border border-neutral-800/80">
                                {ownerConfirmAction.payload.roomList.map((rm: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-neutral-900 px-2.5 py-1.5 rounded text-[11px] border border-neutral-800">
                                    <span className="text-neutral-300 font-medium truncate">{rm.name}</span>
                                    <span className="text-[#d4af37] font-semibold ml-2">{currency}{rm.rent}/mo</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Lease Covenants & Terms */}
                          {ownerConfirmAction.payload.terms && (
                            <div className="pt-2 border-t border-neutral-800/80">
                              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block mb-1">Lease Terms & Covenants</span>
                              <p className="text-[11px] text-neutral-400 whitespace-pre-line bg-neutral-950 p-2 rounded border border-neutral-800/50 max-h-24 overflow-y-auto">
                                {ownerConfirmAction.payload.terms}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {ownerConfirmAction.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800/80 flex justify-end gap-2 text-xs shrink-0">
                    <button
                      onClick={() => setOwnerConfirmAction(null)}
                      className="py-2 px-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all duration-300"
                    >
                      Dismiss / Edit
                    </button>
                    <button
                      onClick={handleExecuteOwnerAction}
                      className="py-2 px-4 rounded-lg bg-[#d4af37] hover:bg-[#c5a880] text-black font-semibold tracking-wider uppercase transition-all duration-300 shadow-lg shadow-[#d4af37]/10"
                    >
                      {ownerConfirmAction.type === 'add_property' ? 'Confirm & Issue Deed' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={ownerUser}
        onUpdateSuccess={(updatedUser) => {
          if (onUpdateProfile) {
            onUpdateProfile(updatedUser);
          }
        }}
      />

    </div>
  );
}
