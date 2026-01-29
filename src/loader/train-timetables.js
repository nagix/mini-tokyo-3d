import {loadJSON, saveJSON, readdir} from './helpers';

function process(data, calendar, postfix) {

    const filteredData = data.filter(item =>
        item.id.endsWith(`.${calendar}`) || item.id.includes(`.${calendar}.`)
    );

    saveJSON(`build/data/timetable-${postfix}.json.gz`, filteredData);

    console.log(`${calendar} train timetable data was loaded`);
}

export default async function() {

    const files = await readdir('data/train-timetables');

    const data = [].concat(...await Promise.all(files.map(file =>
        loadJSON(`data/train-timetables/${file}`)
    )));

    process(data, 'Weekday', 'weekday');
    process(data, 'Saturday', 'saturday');
    process(data, 'Holiday', 'sunday-holiday');
    process(data, 'SaturdayHoliday', 'holiday');

}
