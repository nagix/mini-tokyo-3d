export function encode(data, pbf) {
    pbf.writeStringField(1, data.agency);
    for (const stop of data.stops) {
        pbf.writeMessage(2, (obj, pbf) => {
            pbf.writeStringField(1, obj.id);
            pbf.writeMessage(2, (obj, pbf) => {
                pbf.writeStringField(1, obj.en);
                pbf.writeStringField(2, obj.ja);
            }, obj.name);
            pbf.writePackedDouble(3, obj.coord);
        }, stop);
    }
    for (const trip of data.trips) {
        pbf.writeMessage(3, (obj, pbf) => {
            pbf.writeStringField(1, obj.id);
            pbf.writeMessage(2, (obj, pbf) => {
                pbf.writeStringField(1, obj.en);
                pbf.writeStringField(2, obj.ja);
            }, obj.shortName);
            pbf.writeStringField(3, obj.color);
            pbf.writeStringField(4, obj.textColor);
            pbf.writeStringField(5, obj.shape);
            for (const stop of obj.stops) {
                pbf.writeStringField(6, stop);
            }
            pbf.writePackedVarint(7, obj.stopSequences);
            pbf.writeMessage(8, (obj, pbf) => {
                pbf.writeStringField(1, obj.en);
                pbf.writeStringField(2, obj.ja);
            }, obj.headsign);
        }, trip);
    }
    return pbf.finish();
}

export function decode(pbf) {
    return pbf.readFields((tag, obj, pbf) => {
        if (tag === 1) obj.agency = pbf.readString();
        if (tag === 2) obj.stops.push(pbf.readFields((tag, obj, pbf) => {
            if (tag === 1) obj.id = pbf.readString();
            else if (tag === 2) obj.name = pbf.readFields((tag, obj, pbf) => {
                if (tag === 1) obj.en = pbf.readString();
                else if (tag === 2) obj.ja = pbf.readString();
            }, {}, pbf.readVarint() + pbf.pos);
            else if (tag === 3) obj.coord = pbf.readPackedDouble();
        }, {}, pbf.readVarint() + pbf.pos));
        if (tag === 3) obj.trips.push(pbf.readFields((tag, obj, pbf) => {
            if (tag === 1) obj.id = pbf.readString();
            else if (tag === 2) obj.shortName = pbf.readFields((tag, obj, pbf) => {
                if (tag === 1) obj.en = pbf.readString();
                else if (tag === 2) obj.ja = pbf.readString();
            }, {}, pbf.readVarint() + pbf.pos);
            else if (tag === 3) obj.color = pbf.readString();
            else if (tag === 4) obj.textColor = pbf.readString();
            else if (tag === 5) obj.shape = pbf.readString();
            else if (tag === 6) obj.stops.push(pbf.readString());
            else if (tag === 7) pbf.readPackedVarint(obj.stopSequences, true);
            else if (tag === 8) obj.headsign = pbf.readFields((tag, obj, pbf) => {
                if (tag === 1) obj.en = pbf.readString();
                else if (tag === 2) obj.ja = pbf.readString();
            }, {}, pbf.readVarint() + pbf.pos);
        }, {stops: [], stopSequences: []}, pbf.readVarint() + pbf.pos));
    }, {stops: [], trips: []});
}
