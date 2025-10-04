
/**
 * Fetches climate data from NASA's POWER API for given coordinates and formats the data s.t. [day][year]
 * @param {Number} longitude 
 * @param {Number} latitude 
 */
async function fetchData(longitude, latitude) {
    // todo: set the proper dates [earliest, today (date api pls)]
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR&community=AG&longitude=${longitude}&latitude=${latitude}&start=19810101&end=20251003&time-standard=UTC&format=JSON`;

    const response = await fetch(url);
    const payload = await response.json();

    console.log(payload);
    return payload;

}
export { fetchData };