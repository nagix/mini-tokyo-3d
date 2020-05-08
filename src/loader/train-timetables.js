import * as helpers from '../helpers';
import * as loaderHelpers from './helpers';

const CALENDARS = [
    'Weekday',
    'SaturdayHoliday'
];

const CALENDAR_POSTFIXES = [
    'weekday',
    'holiday'
];

const RAILWAYS_FOR_TRAINTIMETABLES = [
    ['JR-East.Yamanote'],
    ['JR-East.ChuoRapid'],
    ['JR-East.Ome', 'JR-East.Itsukaichi'],
    ['JR-East.ChuoSobuLocal'],
    ['JR-East.Tokaido', 'JR-East.Utsunomiya', 'JR-East.Takasaki'],
    ['JR-East.KeihinTohokuNegishi'],
    ['JR-East.JobanRapid', 'JR-East.JobanLocal'],
    ['JR-East.SobuRapid', 'JR-East.Sobu', 'JR-East.Narita', 'JR-East.NaritaAirportBranch'],
    ['JR-East.Uchibo', 'JR-East.Sotobo'],
    ['JR-East.Yokosuka', 'JR-East.Keiyo'],
    ['JR-East.SaikyoKawagoe', 'JR-East.ShonanShinjuku'],
    ['JR-East.Tsurumi', 'JR-East.TsurumiUmiShibauraBranch', 'JR-East.TsurumiOkawaBranch', 'JR-East.Nambu', 'JR-East.NambuBranch'],
    ['JR-East.Musashino', 'JR-East.Yokohama', 'TWR.Rinkai'],
    ['TokyoMetro.Ginza'],
    ['TokyoMetro.Marunouchi'],
    ['TokyoMetro.MarunouchiBranch'],
    ['TokyoMetro.Hibiya'],
    ['TokyoMetro.Tozai'],
    ['TokyoMetro.Chiyoda'],
    ['TokyoMetro.Yurakucho'],
    ['TokyoMetro.Hanzomon'],
    ['TokyoMetro.Namboku', 'TokyoMetro.Fukutoshin'],
    ['Toei.Asakusa'],
    ['Toei.Mita', 'Toei.Shinjuku'],
    ['Toei.Oedo', 'Toei.NipporiToneri'],
    ['YokohamaMunicipal.Blue', 'YokohamaMunicipal.Green']
];

const RAILWAY_YOKOSUKA = 'JR-East.Yokosuka',
    RAILWAY_SHONANSHINJUKU = 'JR-East.ShonanShinjuku',
    RAILWAY_YAMANOTEFREIGHT = 'JR-East.YamanoteFreight',
    RAILWAY_KEIYO = 'JR-East.Keiyo',
    RAILWAY_KEIYOKOYABRANCH = 'JR-East.KeiyoKoyaBranch',
    RAILWAY_KEIYOFUTAMATABRANCH = 'JR-East.KeiyoFutamataBranch',
    RAILWAY_OEDO = 'Toei.Oedo';

const RAILWAYS_FOR_SOBURAPID = [
    'JR-East.NaritaAirportBranch',
    'JR-East.Narita',
    'JR-East.Sobu'
];

const TRAINTYPES_FOR_SOBURAPID = [
    'JR-East.Rapid',
    'JR-East.LimitedExpress'
];

const TRAINTYPE_FOR_YAMANOTEFREIGHT = 'JR-East.LimitedExpress';

const STATION_KEIYO_NISHIFUNABASHI = 'JR-East.Keiyo.NishiFunabashi',
    STATION_OEDO_TOCHOMAE = 'Toei.Oedo.Tochomae',
    STATION_OEDO_SHINJUKUNISHIGUCHI = 'Toei.Oedo.ShinjukuNishiguchi';

export default async function(url, key) {

    return Promise.all(CALENDARS.map(async (calendar, i) => {
        const original = await Promise.all(
            RAILWAYS_FOR_TRAINTIMETABLES.map(railwayGroup => {
                const railways = railwayGroup.map(railway => `odpt.Railway:${railway}`);
                return loaderHelpers.loadJSON(`${url}odpt:TrainTimetable?odpt:railway=${railways.join(',')}&odpt:calendar=odpt.Calendar:${calendar}&acl:consumerKey=${key}`);
            }).concat(
                loaderHelpers.loadJSON(`data/timetable-${CALENDAR_POSTFIXES[i]}.json`)
            )
        );

        const extra = original.pop();

        const data = [].concat(...original).map(timetable => ({
            t: helpers.removePrefix(timetable['odpt:train']),
            id: helpers.removePrefix(timetable['owl:sameAs']),
            r: helpers.removePrefix(timetable['odpt:railway']),
            y: helpers.removePrefix(timetable['odpt:trainType']),
            n: timetable['odpt:trainNumber'],
            os: helpers.removePrefix(timetable['odpt:originStation']),
            d: helpers.removePrefix(timetable['odpt:railDirection']),
            ds: helpers.removePrefix(timetable['odpt:destinationStation']),
            nt: helpers.removePrefix(timetable['odpt:nextTrainTimetable']),
            tt: timetable['odpt:trainTimetableObject'].map(obj => {
                const as = helpers.removePrefix(obj['odpt:arrivalStation']);
                const ds = helpers.removePrefix(obj['odpt:departureStation']);

                if (as && ds && as !== ds) {
                    console.log(`Error: ${as} != ${ds}`);
                }
                return helpers.cleanKeys({
                    a: obj['odpt:arrivalTime'],
                    d: obj['odpt:departureTime'],
                    s: as || ds
                });
            }),
            pt: helpers.removePrefix(timetable['odpt:previousTrainTimetable']),
            nm: timetable['odpt:trainName']
        }));

        const lookup = helpers.buildLookup(data);

        extra.forEach(timetable => {
            const {id, tt, pt, nt, nm, v} = timetable,
                timetableRef = lookup[id];

            if (!timetableRef) {
                if (tt) {
                    lookup[id] = timetable;
                    data.push(timetable);
                } else {
                    console.log('No connecting train', timetable);
                }
            } else {
                if (pt) {
                    timetableRef.pt = pt;
                }
                if (nt) {
                    timetableRef.nt = nt;
                }
                timetableRef.nm = nm;
                timetableRef.v = v;
            }
        });

        // Modify Sobu Rapid, Sobu, Narita and Narita Airport branch timetables
        RAILWAYS_FOR_SOBURAPID.forEach(railwayID => {
            data.filter(timetable =>
                timetable.r === railwayID && helpers.includes(TRAINTYPES_FOR_SOBURAPID, timetable.y)
            ).forEach(timetable => {
                const {id, tt, nt, pt} = timetable;
                let nextTable, prevTable;

                if (nt) {
                    nextTable = lookup[nt[0]];
                }
                if (pt) {
                    prevTable = lookup[pt[0]];
                }
                if (nextTable || prevTable) {
                    const r = (nextTable || prevTable).r;

                    tt.forEach(obj => {
                        obj.s = obj.s.replace(railwayID, r);
                    });
                }

                if (nextTable) {
                    const ntt = nextTable.tt;

                    if (!tt[tt.length - 1].d && !ntt[0].a) {
                        Object.assign(ntt[0], tt.pop());
                    }
                    Array.prototype.splice.apply(ntt, [0, 0].concat(tt));
                    delete nextTable.pt;
                } else if (prevTable) {
                    const ptt = prevTable.tt;

                    if (!tt[0].a && !ptt[ptt.length - 1].d) {
                        Object.assign(ptt[ptt.length - 1], tt.shift());
                    }
                    Array.prototype.splice.apply(ptt, [ptt.length, 0].concat(tt));
                    delete prevTable.nt;
                }
                data.splice(data.indexOf(timetable), 1);
                delete lookup[id];
            });
        });

        // Modify Yokosuka, Shonan Shinjuku and Yamanote Freight timetables
        data.filter(timetable =>
            timetable.r === RAILWAY_YOKOSUKA &&
            timetable.y === TRAINTYPE_FOR_YAMANOTEFREIGHT &&
            ((timetable.pt && timetable.pt[0].indexOf(RAILWAY_SHONANSHINJUKU) === 0) ||
            (timetable.nt && timetable.nt[0].indexOf(RAILWAY_SHONANSHINJUKU) === 0))
        ).forEach(timetable => {
            timetable.tt.forEach(obj => {
                obj.s = obj.s.replace(timetable.r, RAILWAY_YAMANOTEFREIGHT);
            });
            timetable.r = RAILWAY_YAMANOTEFREIGHT;
        });
        data.filter(timetable =>
            timetable.r === RAILWAY_SHONANSHINJUKU &&
            timetable.y === TRAINTYPE_FOR_YAMANOTEFREIGHT &&
            ((timetable.nt && timetable.nt[0].indexOf(RAILWAY_YOKOSUKA) === 0) ||
            (timetable.pt && timetable.pt[0].indexOf(RAILWAY_YOKOSUKA) === 0))
        ).forEach(timetable => {
            const {r: railwayID, tt, nt, pt} = timetable;

            if (nt && nt[0].indexOf(RAILWAY_YOKOSUKA) === 0) {
                const station = tt[tt.length - 1];

                lookup[nt[0]].tt.unshift({
                    d: station.d,
                    s: station.s.replace(railwayID, RAILWAY_YAMANOTEFREIGHT)
                });
                delete station.d;
            } else if (pt && pt[0].indexOf(RAILWAY_YOKOSUKA) === 0) {
                const station = tt[0];

                lookup[pt[0]].tt.push({
                    a: station.a,
                    s: station.s.replace(railwayID, RAILWAY_YAMANOTEFREIGHT)
                });
                delete station.a;
            }
        });

        // Modify Keiyo branch timetables
        data.filter(timetable => {
            const {r, tt} = timetable;

            return r === RAILWAY_KEIYO &&
                (tt[0].s === STATION_KEIYO_NISHIFUNABASHI ||
                tt[tt.length - 1].s === STATION_KEIYO_NISHIFUNABASHI);
        }).forEach(timetable => {
            const {tt, d: direction, os, ds} = timetable,
                startFromNishiFunabashi = tt[0].s === STATION_KEIYO_NISHIFUNABASHI,
                railwayID = timetable.r = (startFromNishiFunabashi && direction === 'Outbound') ||
                    (!startFromNishiFunabashi && direction === 'Inbound') ?
                    RAILWAY_KEIYOKOYABRANCH : RAILWAY_KEIYOFUTAMATABRANCH;

            [os, ds].forEach(stations =>
                stations.forEach((station, i) => {
                    stations[i] = station.replace(RAILWAY_KEIYO, railwayID);
                })
            );
            tt.forEach(obj => {
                obj.s = obj.s.replace(RAILWAY_KEIYO, railwayID);
            });
        });

        // Modify Toei Oedo timetables
        data.filter(timetable =>
            timetable.r === RAILWAY_OEDO
        ).forEach(timetable => {
            const {tt} = timetable;

            tt.forEach((obj, i) => {
                const prev = tt[i - 1] || {},
                    next = tt[i + 1] || {};

                if (obj.s === STATION_OEDO_TOCHOMAE &&
                    prev.s !== STATION_OEDO_SHINJUKUNISHIGUCHI &&
                    next.s !== STATION_OEDO_SHINJUKUNISHIGUCHI) {
                    obj.s += '.1';
                }
            });
        });

        loaderHelpers.saveJSON(`build/data/timetable-${CALENDAR_POSTFIXES[i]}.json.gz`, data);

        console.log(`${calendar} train timetable data was loaded`);
    }));

}
