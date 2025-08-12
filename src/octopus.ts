type OctopusPrice = {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: Date;
  valid_to: Date;
  payment_method: null;
};

type OctopusResults = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OctopusPrice[];
};

async function getAllPricesForPeriod(locationCode: string, periodStart: Date, periodEnd: Date): Promise<OctopusPrice[]> {
  const octopusDataUrl =
    `https://api.octopus.energy/v1/products/AGILE-BB-23-12-06/electricity-tariffs/E-1R-AGILE-BB-23-12-06-${locationCode}/standard-unit-rates/?period_from=${periodStart.toISOString()}&period_to=${periodEnd.toISOString()}`;
  
  const data = await fetch(octopusDataUrl);
  const { results } = await data.json() as OctopusResults;
  return results;
}

export async function octopusAgilePricing(location: string): Promise<OctopusPrice> {
  const locationMap = {
    "London": "C",
    "East Midlands": "B",
    "Eastern England": "A",
    "Merseyside & Northern Wales": "D",
    "North Eastern England": "F",
    "North Western England": "G",
    "Northern Scotland": "P",
    "South Eastern England": "J",
    "South Western England": "L",
    "Southern England": "H",
    "Southern Scotland": "N",
    "Southern Wales": "K",
    "West Midlands": "E",
    "Yorkshire": "M",
  };
  
  const locationCode = locationMap[location as keyof typeof locationMap];
  const octopusDataUrl =
    `https://api.octopus.energy/v1/products/AGILE-BB-23-12-06/electricity-tariffs/E-1R-AGILE-BB-23-12-06-${locationCode}/standard-unit-rates/`;
  
  const data = await fetch(octopusDataUrl);
  let { results: results, next: next } = await data.json() as OctopusResults;
  
  const now = results.filter((data) =>
    Date.parse(data.valid_from.toString()) < Date.now()
    && Date.parse(data.valid_to.toString()) > Date.now()
  );
  
  if (now[0] == null) {
    const nextData = await fetch(next!);
    let { results: results } = await nextData.json() as OctopusResults;
    const nextNow = results.filter((data) =>
      Date.parse(data.valid_from.toString()) < Date.now()
      && Date.parse(data.valid_to.toString()) > Date.now()
    );
    return nextNow[0];
  }
  else {
    return (now[0]);
  }
}

export async function getCheapestPriceForDay(location: string, date: Date): Promise<OctopusPrice | null> {
  const locationMap = {
    "London": "C",
    "East Midlands": "B",
    "Eastern England": "A",
    "Merseyside & Northern Wales": "D",
    "North Eastern England": "F",
    "North Western England": "G",
    "Northern Scotland": "P",
    "South Eastern England": "J",
    "South Western England": "L",
    "Southern England": "H",
    "Southern Scotland": "N",
    "Southern Wales": "K",
    "West Midlands": "E",
    "Yorkshire": "M",
  };
  
  const locationCode = locationMap[location as keyof typeof locationMap];
  
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);
    
    if (prices.length === 0) {
      return null;
    }
    
    return prices.reduce((cheapest, current) => 
      current.value_inc_vat < cheapest.value_inc_vat ? current : cheapest
    );
  } catch (error) {
    console.error('Error getting cheapest price:', error);
    return null;
  }
}

export async function getFreeElectricityPeriodsForDay(location: string, date: Date): Promise<OctopusPrice[]> {
  const locationMap = {
    "London": "C",
    "East Midlands": "B",
    "Eastern England": "A",
    "Merseyside & Northern Wales": "D",
    "North Eastern England": "F",
    "North Western England": "G",
    "Northern Scotland": "P",
    "South Eastern England": "J",
    "South Western England": "L",
    "Southern England": "H",
    "Southern Scotland": "N",
    "Southern Wales": "K",
    "West Midlands": "E",
    "Yorkshire": "M",
  };
  
  const locationCode = locationMap[location as keyof typeof locationMap];
  
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);
    
    // Return prices that are 0 or negative (free/paid to use electricity)
    return prices.filter(price => price.value_inc_vat <= 0);
  } catch (error) {
    console.error('Error getting free electricity periods:', error);
    return [];
  }
}

export async function getCheapestUpcomingPrice(location: string, date: Date): Promise<OctopusPrice | null> {
  const locationMap = {
    "London": "C",
    "East Midlands": "B",
    "Eastern England": "A",
    "Merseyside & Northern Wales": "D",
    "North Eastern England": "F",
    "North Western England": "G",
    "Northern Scotland": "P",
    "South Eastern England": "J",
    "South Western England": "L",
    "Southern England": "H",
    "Southern Scotland": "N",
    "Southern Wales": "K",
    "West Midlands": "E",
    "Yorkshire": "M",
  };
  
  const locationCode = locationMap[location as keyof typeof locationMap];
  
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);
    
    if (prices.length === 0) {
      return null;
    }
    
    const now = new Date();
    
    // Filter prices to only include future periods
    const upcomingPrices = prices.filter(price => 
      new Date(price.valid_from) > now
    );
    
    if (upcomingPrices.length === 0) {
      return null;
    }
    
    // Find the cheapest among upcoming prices
    return upcomingPrices.reduce((cheapest, current) => 
      current.value_inc_vat < cheapest.value_inc_vat ? current : cheapest
    );
  } catch (error) {
    console.error('Error getting cheapest upcoming price:', error);
    return null;
  }
}

export async function getMostExpensivePriceForDay(location: string, date: Date): Promise<OctopusPrice | null> {
  const locationMap = {
    "London": "C",
    "East Midlands": "B",
    "Eastern England": "A",
    "Merseyside & Northern Wales": "D",
    "North Eastern England": "F",
    "North Western England": "G",
    "Northern Scotland": "P",
    "South Eastern England": "J",
    "South Western England": "L",
    "Southern England": "H",
    "Southern Scotland": "N",
    "Southern Wales": "K",
    "West Midlands": "E",
    "Yorkshire": "M",
  };
  
  const locationCode = locationMap[location as keyof typeof locationMap];
  
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  
  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);
    
    if (prices.length === 0) {
      return null;
    }
    
    return prices.reduce((mostExpensive, current) => 
      current.value_inc_vat > mostExpensive.value_inc_vat ? current : mostExpensive
    );
  } catch (error) {
    console.error('Error getting most expensive price:', error);
    return null;
  }
}