// EAN-13 Country Prefixes
// Source: GS1 (Global Standards Organization)
// Each country/region has assigned prefixes for product barcodes

export const eanCountryCodes = [
  // Europe
  { code: "590", name: "Poland", region: "Europe" },
  { code: "400", name: "Germany", region: "Europe" },
  { code: "401", name: "Germany", region: "Europe" },
  { code: "440", name: "Germany", region: "Europe" },
  { code: "500", name: "United Kingdom", region: "Europe" },
  { code: "501", name: "United Kingdom", region: "Europe" },
  { code: "539", name: "Ireland", region: "Europe" },
  { code: "560", name: "Portugal", region: "Europe" },
  { code: "569", name: "Iceland", region: "Europe" },
  { code: "570", name: "Denmark", region: "Europe" },
  { code: "571", name: "Denmark", region: "Europe" },
  { code: "590", name: "Poland", region: "Europe" },
  { code: "594", name: "Romania", region: "Europe" },
  { code: "599", name: "Hungary", region: "Europe" },
  { code: "600", name: "South Africa", region: "Africa" },
  { code: "601", name: "South Africa", region: "Africa" },
  { code: "608", name: "Bahrain", region: "Middle East" },
  { code: "609", name: "Mauritius", region: "Africa" },
  { code: "611", name: "Morocco", region: "Africa" },
  { code: "613", name: "Algeria", region: "Africa" },
  { code: "616", name: "Kenya", region: "Africa" },
  { code: "618", name: "Ivory Coast", region: "Africa" },
  { code: "619", name: "Tunisia", region: "Africa" },
  { code: "621", name: "Syria", region: "Middle East" },
  { code: "622", name: "Egypt", region: "Africa" },
  { code: "624", name: "Libya", region: "Africa" },
  { code: "625", name: "Jordan", region: "Middle East" },
  { code: "626", name: "Iran", region: "Middle East" },
  { code: "627", name: "Kuwait", region: "Middle East" },
  { code: "628", name: "Saudi Arabia", region: "Middle East" },
  { code: "629", name: "United Arab Emirates", region: "Middle East" },
  { code: "640", name: "Finland", region: "Europe" },
  { code: "690", name: "China", region: "Asia" },
  { code: "691", name: "China", region: "Asia" },
  { code: "692", name: "China", region: "Asia" },
  { code: "693", name: "China", region: "Asia" },
  { code: "694", name: "China", region: "Asia" },
  { code: "695", name: "China", region: "Asia" },
  { code: "700", name: "Norway", region: "Europe" },
  { code: "729", name: "Israel", region: "Middle East" },
  { code: "730", name: "Sweden", region: "Europe" },
  { code: "731", name: "Sweden", region: "Europe" },
  { code: "740", name: "Guatemala", region: "Americas" },
  { code: "741", name: "El Salvador", region: "Americas" },
  { code: "742", name: "Honduras", region: "Americas" },
  { code: "743", name: "Nicaragua", region: "Americas" },
  { code: "744", name: "Costa Rica", region: "Americas" },
  { code: "745", name: "Panama", region: "Americas" },
  { code: "746", name: "Dominican Republic", region: "Americas" },
  { code: "750", name: "Mexico", region: "Americas" },
  { code: "754", name: "Canada", region: "Americas" },
  { code: "755", name: "Canada", region: "Americas" },
  { code: "759", name: "Venezuela", region: "Americas" },
  { code: "760", name: "Switzerland", region: "Europe" },
  { code: "761", name: "Switzerland", region: "Europe" },
  { code: "770", name: "Colombia", region: "Americas" },
  { code: "771", name: "Colombia", region: "Americas" },
  { code: "773", name: "Uruguay", region: "Americas" },
  { code: "775", name: "Peru", region: "Americas" },
  { code: "777", name: "Bolivia", region: "Americas" },
  { code: "779", name: "Argentina", region: "Americas" },
  { code: "780", name: "Chile", region: "Americas" },
  { code: "784", name: "Paraguay", region: "Americas" },
  { code: "786", name: "Ecuador", region: "Americas" },
  { code: "789", name: "Brazil", region: "Americas" },
  { code: "790", name: "Brazil", region: "Americas" },
  { code: "800", name: "Italy", region: "Europe" },
  { code: "801", name: "Italy", region: "Europe" },
  { code: "839", name: "Italy", region: "Europe" },
  { code: "840", name: "Spain", region: "Europe" },
  { code: "841", name: "Spain", region: "Europe" },
  { code: "849", name: "Spain", region: "Europe" },
  { code: "850", name: "Cuba", region: "Americas" },
  { code: "858", name: "Slovakia", region: "Europe" },
  { code: "859", name: "Czech Republic", region: "Europe" },
  { code: "860", name: "Serbia", region: "Europe" },
  { code: "865", name: "Mongolia", region: "Asia" },
  { code: "867", name: "North Korea", region: "Asia" },
  { code: "868", name: "Turkey", region: "Europe/Asia" },
  { code: "869", name: "Turkey", region: "Europe/Asia" },
  { code: "870", name: "Netherlands", region: "Europe" },
  { code: "871", name: "Netherlands", region: "Europe" },
  { code: "880", name: "South Korea", region: "Asia" },
  { code: "884", name: "Cambodia", region: "Asia" },
  { code: "885", name: "Thailand", region: "Asia" },
  { code: "888", name: "Singapore", region: "Asia" },
  { code: "890", name: "India", region: "Asia" },
  { code: "893", name: "Vietnam", region: "Asia" },
  { code: "899", name: "Indonesia", region: "Asia" },
  { code: "900", name: "Austria", region: "Europe" },
  { code: "901", name: "Austria", region: "Europe" },
  { code: "930", name: "Australia", region: "Oceania" },
  { code: "931", name: "Australia", region: "Oceania" },
  { code: "939", name: "Australia", region: "Oceania" },
  { code: "940", name: "New Zealand", region: "Oceania" },
  { code: "949", name: "New Zealand", region: "Oceania" },
  { code: "955", name: "Malaysia", region: "Asia" },
  { code: "958", name: "Macau", region: "Asia" },

  // North America (special: 00-09, 10-13)
  { code: "000", name: "United States", region: "Americas" },
  { code: "001", name: "United States", region: "Americas" },
  { code: "002", name: "United States", region: "Americas" },
  { code: "003", name: "United States", region: "Americas" },
  { code: "004", name: "United States", region: "Americas" },
  { code: "005", name: "United States", region: "Americas" },
  { code: "006", name: "United States", region: "Americas" },
  { code: "007", name: "United States", region: "Americas" },
  { code: "008", name: "United States", region: "Americas" },
  { code: "009", name: "United States", region: "Americas" },
  { code: "010", name: "United States", region: "Americas" },
  { code: "011", name: "United States", region: "Americas" },
  { code: "012", name: "United States", region: "Americas" },
  { code: "013", name: "United States", region: "Americas" },

  // France (special: 30-37)
  { code: "300", name: "France", region: "Europe" },
  { code: "301", name: "France", region: "Europe" },
  { code: "302", name: "France", region: "Europe" },
  { code: "303", name: "France", region: "Europe" },
  { code: "304", name: "France", region: "Europe" },
  { code: "305", name: "France", region: "Europe" },
  { code: "306", name: "France", region: "Europe" },
  { code: "307", name: "France", region: "Europe" },
  { code: "308", name: "France", region: "Europe" },
  { code: "309", name: "France", region: "Europe" },
  { code: "310", name: "France", region: "Europe" },
  { code: "370", name: "France", region: "Europe" },
  { code: "379", name: "France", region: "Europe" },

  // Belgium & Luxembourg
  { code: "540", name: "Belgium & Luxembourg", region: "Europe" },
  { code: "541", name: "Belgium & Luxembourg", region: "Europe" },
  { code: "549", name: "Belgium & Luxembourg", region: "Europe" },

  // Japan (special: 45-49)
  { code: "450", name: "Japan", region: "Asia" },
  { code: "451", name: "Japan", region: "Asia" },
  { code: "452", name: "Japan", region: "Asia" },
  { code: "453", name: "Japan", region: "Asia" },
  { code: "454", name: "Japan", region: "Asia" },
  { code: "455", name: "Japan", region: "Asia" },
  { code: "456", name: "Japan", region: "Asia" },
  { code: "457", name: "Japan", region: "Asia" },
  { code: "458", name: "Japan", region: "Asia" },
  { code: "459", name: "Japan", region: "Asia" },
  { code: "490", name: "Japan", region: "Asia" },
  { code: "491", name: "Japan", region: "Asia" },
  { code: "499", name: "Japan", region: "Asia" },
];

// Get unique countries (since some have multiple codes)
export const getUniqueCountries = () => {
  const countryMap = new Map();

  eanCountryCodes.forEach(item => {
    if (!countryMap.has(item.name)) {
      countryMap.set(item.name, {
        name: item.name,
        region: item.region,
        codes: [item.code]
      });
    } else {
      countryMap.get(item.name).codes.push(item.code);
    }
  });

  return Array.from(countryMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Get primary code for a country (first one in the list)
export const getPrimaryCodeForCountry = (countryName) => {
  const country = eanCountryCodes.find(c => c.name === countryName);
  return country ? country.code : null;
};

// Get country by code
export const getCountryByCode = (code) => {
  return eanCountryCodes.find(c => c.code === code);
};
