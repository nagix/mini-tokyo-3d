import {loadJSON, saveJSON, readdir} from './helpers';

async function process(data, calendar, postfix) {

    const filteredData = data.filter(item =>
        item.id.endsWith(`.${calendar}`) || item.id.includes(`.${calendar}.`)
    );

    saveJSON(`build/data/timetable-${postfix}.json.gz`, filteredData);

    console.log(`${calendar} train timetable data was loaded`);
}

export default async function() {

    const files = await readdir('data/train-timetables');

    const data = [];

    for (const file of files) {
        data.push(...await loadJSON(`data/train-timetables/${file}`));
    }

    await process(data, 'Weekday', 'weekday');
    await process(data, 'Saturday', 'saturday');
    await process(data, 'Holiday', 'sunday-holiday');
    await process(data, 'SaturdayHoliday', 'holiday');

}
