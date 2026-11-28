export function encode(data, pbf) {
    pbf.writeStringField(1, data.agency);
    for (const stop of data.stops) {
        pbf.writeMessage(2, (obj, pbf) => {
            pbf.writeStringField(1, obj.id);
            pbf.writeStringField(2, obj.name);
            pbf.writePackedDouble(3, obj.coord);
        }, stop);
    }
    for (const route of data.routes) {
        pbf.writeMessage(3, (obj, pbf) => {
            pbf.writeStringField(1, obj.id);
            if (obj.shortName) pbf.writeStringField(2, obj.shortName);
            if (obj.longName) pbf.writeStringField(3, obj.longName);
            if (obj.color) pbf.writeStringField(4, obj.color);
            if (obj.textColor) pbf.writeStringField(5, obj.textColor);
            for (const shape of obj.shapes) {
                pbf.writeStringField(6, shape);
            }
        }, route);
    }
    for (const trip of data.trips) {
        pbf.writeMessage(4, (obj, pbf) => {
            pbf.writeStringField(1, obj.id);
            pbf.writeStringField(2, obj.route);
            pbf.writeStringField(3, obj.shape);
            pbf.writePackedVarint(4, obj.departureTimes);
            for (const stop of obj.stops) {
                pbf.writeStringField(5, stop);
            }
            pbf.writePackedVarint(6, obj.stopSequences);
            for (const headsign of obj.headsigns) {
                pbf.writeStringField(7, headsign);
            }
        }, trip);
    }
    pbf.writeStringField(5, data.version);
    if (data.timezone) pbf.writeStringField(6, data.timezone);
    return pbf.finish();
}

export function decode(pbf) {
    return pbf.readFields((tag, obj, pbf) => {
        if (tag === 1) obj.agency = pbf.readString();
        if (tag === 2) obj.stops.push(pbf.readFields((tag, obj, pbf) => {
            if (tag === 1) obj.id = pbf.readString();
            else if (tag === 2) obj.name = pbf.readString();
            else if (tag === 3) obj.coord = pbf.readPackedDouble();
        }, {}, pbf.readVarint() + pbf.pos));
        if (tag === 3) obj.routes.push(pbf.readFields((tag, obj, pbf) => {
            if (tag === 1) obj.id = pbf.readString();
            else if (tag === 2) obj.shortName = pbf.readString();
            else if (tag === 3) obj.longName = pbf.readString();
            else if (tag === 4) obj.color = pbf.readString();
            else if (tag === 5) obj.textColor = pbf.readString();
            else if (tag === 6) obj.shapes.push(pbf.readString());
        }, {shapes: []}, pbf.readVarint() + pbf.pos));
        if (tag === 4) obj.trips.push(pbf.readFields((tag, obj, pbf) => {
            if (tag === 1) obj.id = pbf.readString();
            else if (tag === 2) obj.route = pbf.readString();
            else if (tag === 3) obj.shape = pbf.readString();
            else if (tag === 4) pbf.readPackedVarint(obj.departureTimes, true);
            else if (tag === 5) obj.stops.push(pbf.readString());
            else if (tag === 6) pbf.readPackedVarint(obj.stopSequences, true);
            else if (tag === 7) obj.headsigns.push(pbf.readString());
        }, {departureTimes: [], stops: [], stopSequences: [], headsigns: []}, pbf.readVarint() + pbf.pos));
        if (tag === 5) obj.version = pbf.readString();
        if (tag === 6) obj.timezone = pbf.readString();
    }, {stops: [], routes: [], trips: []});
}

export function getStopBundleKey(stop) {
    const name = stop.name,
        areaId = stop.areaId && stop.areaId.trim(),
        parentStation = stop.parentStation && stop.parentStation.trim(),
        id = stop.id,
        routeMode = stop.routeMode;
    const scope = routeMode ? `mode:${routeMode}:` : '';

    if (areaId) {
        return `${scope}${name}\u0000area:${areaId}`;
    }
    if (parentStation && parentStation !== '0') {
        return `${scope}${name}\u0000parent:${parentStation}`;
    }
    return `${scope}${name}\u0000stop:${id}`;
}

export function getStopMunicipality(stopId, stopCode) {
    const code = String(stopCode || '').trim();
    const codeMunicipality = [
        [/^Ke/i, {fi: 'Kerava', sv: 'Kervo'}],
        [/^Ki/i, {fi: 'Kirkkonummi', sv: 'Kyrkslätt'}],
        [/^Ka/i, {fi: 'Kauniainen', sv: 'Grankulla'}],
        [/^V/i, {fi: 'Vantaa', sv: 'Vanda'}],
        [/^E/i, {fi: 'Espoo', sv: 'Esbo'}],
        [/^H/i, {fi: 'Helsinki', sv: 'Helsingfors'}],
        [/^Tu/i, {fi: 'Tuusula', sv: 'Tusby'}],
        [/^Nu/i, {fi: 'Nurmijärvi', sv: 'Nurmijärvi'}],
        [/^Si/i, {fi: 'Siuntio', sv: 'Sjundeå'}]
    ];
    for (const [pattern, municipality] of codeMunicipality) {
        if (pattern.test(code)) {
            return municipality;
        }
    }

    const id = String(stopId || '');
    if (!/^\d{7}$/.test(id)) {
        return undefined;
    }

    const prefix = Number(id.substring(0, 2));
    if (prefix >= 10 && prefix <= 19) {
        return {fi: 'Helsinki', sv: 'Helsingfors'};
    }
    if (prefix >= 20 && prefix <= 29) {
        return {fi: 'Espoo', sv: 'Esbo'};
    }
    if (prefix >= 30 && prefix <= 39) {
        return {fi: 'Kauniainen', sv: 'Grankulla'};
    }
    if (prefix >= 40 && prefix <= 49) {
        return {fi: 'Vantaa', sv: 'Vanda'};
    }
    if (prefix >= 50 && prefix <= 59) {
        return {fi: 'Kerava', sv: 'Kervo'};
    }
    if (prefix >= 60 && prefix <= 69) {
        return {fi: 'Kirkkonummi', sv: 'Kyrkslätt'};
    }
    if (prefix >= 70 && prefix <= 79) {
        return {fi: 'Tuusula', sv: 'Tusby'};
    }
    if (prefix >= 80 && prefix <= 89) {
        return {fi: 'Nurmijärvi', sv: 'Nurmijärvi'};
    }
    if (prefix >= 90 && prefix <= 99) {
        return {fi: 'Siuntio', sv: 'Sjundeå'};
    }
    return undefined;
}
