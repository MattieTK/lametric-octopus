type OctopusPrice = {
  value_exc_vat: number;
  value_inc_vat: number;
  valid_from: string;
  valid_to: string;
  payment_method: null;
};

type OctopusResults = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OctopusPrice[];
};

const LOCATION_MAP = {
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
} as const;

async function getAllPricesForPeriod(locationCode: string, periodStart: Date, periodEnd: Date): Promise<OctopusPrice[]> {
  const octopusDataUrl =
    `https://api.octopus.energy/v1/products/AGILE-BB-23-12-06/electricity-tariffs/E-1R-AGILE-BB-23-12-06-${locationCode}/standard-unit-rates/?period_from=${periodStart.toISOString()}&period_to=${periodEnd.toISOString()}`;

  try {
    const data = await fetch(octopusDataUrl);

    if (!data.ok) {
      console.error('Octopus API request failed:', {
        function: 'getAllPricesForPeriod',
        url: octopusDataUrl,
        status: data.status,
        statusText: data.statusText,
        locationCode,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      });
      throw new Error(`Octopus API returned ${data.status}: ${data.statusText}`);
    }

    const { results } = await data.json() as OctopusResults;
    return results;
  } catch (error) {
    console.error('Error fetching prices for period:', {
      function: 'getAllPricesForPeriod',
      locationCode,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function octopusAgilePricing(location: string): Promise<OctopusPrice> {
  const locationCode = LOCATION_MAP[location as keyof typeof LOCATION_MAP];

  if (!locationCode) {
    console.error('Invalid location provided:', {
      function: 'octopusAgilePricing',
      location,
      validLocations: Object.keys(LOCATION_MAP)
    });
    throw new Error(`Invalid location: ${location}`);
  }

  const octopusDataUrl =
    `https://api.octopus.energy/v1/products/AGILE-BB-23-12-06/electricity-tariffs/E-1R-AGILE-BB-23-12-06-${locationCode}/standard-unit-rates/`;

  try {
    const data = await fetch(octopusDataUrl);

    if (!data.ok) {
      console.error('Octopus API request failed:', {
        function: 'octopusAgilePricing',
        url: octopusDataUrl,
        status: data.status,
        statusText: data.statusText,
        location,
        locationCode
      });
      throw new Error(`Octopus API returned ${data.status}: ${data.statusText}`);
    }

    let { results: results, next: next } = await data.json() as OctopusResults;

    const now = results.filter((data) =>
      Date.parse(data.valid_from) < Date.now()
      && Date.parse(data.valid_to) > Date.now()
    );

    if (now[0] == null) {
      if (!next) {
        console.error('No current price found and no next page available:', {
          function: 'octopusAgilePricing',
          location,
          locationCode,
          resultsCount: results.length,
          firstValidFrom: results[0]?.valid_from,
          lastValidTo: results[results.length - 1]?.valid_to
        });
        throw new Error('No current price found and no next page available');
      }

      const nextData = await fetch(next);

      if (!nextData.ok) {
        console.error('Octopus API next page request failed:', {
          function: 'octopusAgilePricing',
          url: next,
          status: nextData.status,
          statusText: nextData.statusText,
          location,
          locationCode
        });
        throw new Error(`Octopus API next page returned ${nextData.status}: ${nextData.statusText}`);
      }

      let { results: results } = await nextData.json() as OctopusResults;
      const nextNow = results.filter((data) =>
        Date.parse(data.valid_from) < Date.now()
        && Date.parse(data.valid_to) > Date.now()
      );

      if (!nextNow[0]) {
        console.error('No current price found in next page:', {
          function: 'octopusAgilePricing',
          location,
          locationCode,
          nextPageResultsCount: results.length,
          firstValidFrom: results[0]?.valid_from,
          lastValidTo: results[results.length - 1]?.valid_to
        });
        throw new Error('No current price found');
      }

      return nextNow[0];
    }
    else {
      return (now[0]);
    }
  } catch (error) {
    console.error('Error getting current Agile pricing:', {
      function: 'octopusAgilePricing',
      location,
      locationCode,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function getCheapestPriceForDay(location: string, date: Date): Promise<OctopusPrice | null> {
  const locationCode = LOCATION_MAP[location as keyof typeof LOCATION_MAP];

  if (!locationCode) {
    console.error('Invalid location provided:', {
      function: 'getCheapestPriceForDay',
      location,
      validLocations: Object.keys(LOCATION_MAP)
    });
    return null;
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);

    if (prices.length === 0) {
      console.warn('No prices found for day:', {
        function: 'getCheapestPriceForDay',
        location,
        locationCode,
        date: date.toISOString(),
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString()
      });
      return null;
    }

    return prices.reduce((cheapest, current) =>
      current.value_inc_vat < cheapest.value_inc_vat ? current : cheapest
    );
  } catch (error) {
    console.error('Error getting cheapest price:', {
      function: 'getCheapestPriceForDay',
      location,
      locationCode,
      date: date.toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

export async function getFreeElectricityPeriodsForDay(location: string, date: Date): Promise<OctopusPrice[]> {
  const locationCode = LOCATION_MAP[location as keyof typeof LOCATION_MAP];

  if (!locationCode) {
    console.error('Invalid location provided:', {
      function: 'getFreeElectricityPeriodsForDay',
      location,
      validLocations: Object.keys(LOCATION_MAP)
    });
    return [];
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);

    // Return prices that are 0 or negative (free/paid to use electricity)
    return prices.filter(price => price.value_inc_vat <= 0);
  } catch (error) {
    console.error('Error getting free electricity periods:', {
      function: 'getFreeElectricityPeriodsForDay',
      location,
      locationCode,
      date: date.toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return [];
  }
}

export async function getCheapestUpcomingPrice(location: string, date: Date): Promise<OctopusPrice | null> {
  const locationCode = LOCATION_MAP[location as keyof typeof LOCATION_MAP];

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

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
  const locationCode = LOCATION_MAP[location as keyof typeof LOCATION_MAP];

  if (!locationCode) {
    console.error('Invalid location provided:', {
      function: 'getMostExpensivePriceForDay',
      location,
      validLocations: Object.keys(LOCATION_MAP)
    });
    return null;
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  try {
    const prices = await getAllPricesForPeriod(locationCode, dayStart, dayEnd);

    if (prices.length === 0) {
      console.warn('No prices found for day:', {
        function: 'getMostExpensivePriceForDay',
        location,
        locationCode,
        date: date.toISOString(),
        dayStart: dayStart.toISOString(),
        dayEnd: dayEnd.toISOString()
      });
      return null;
    }

    return prices.reduce((mostExpensive, current) =>
      current.value_inc_vat > mostExpensive.value_inc_vat ? current : mostExpensive
    );
  } catch (error) {
    console.error('Error getting most expensive price:', {
      function: 'getMostExpensivePriceForDay',
      location,
      locationCode,
      date: date.toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}