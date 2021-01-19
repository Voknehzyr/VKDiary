import moment from 'moment';
import { MessageContext } from 'vk-io';
import { BaseCommand } from '../../core/classes/BaseCommand';
import replacements from '../../core/database/models/replacements';
import schedules from '../../core/database/models/schedules';
import subjects from '../../core/database/models/subjects';
import subjectTimes from '../../core/database/models/subjectTimes';
import TimeConverter from '../../core/utils/TimeConverter';

export default class extends BaseCommand {
    constructor() {
        super();
        this.commandData = {
            command: 'расписание',
            aliases: ['дневник','уроки','расп'],
            permissionLevel: 0,
            local: false
        }
    }

    async execute(context: MessageContext, args: string[], next: any) {
            let dayOfMonth = moment(Date.now()).date();

            if (args[0] !== undefined) {
                if (Number(args[0]) > 31 || Number(args[0]) <= 0) {
                    return context.reply('День может быть только от 1 до 31');
                }

                dayOfMonth = Number(args[0]);
            }

        let weekDay = moment(dayOfMonth, 'DD').day();
            let month;

            if (args[1]) {
                if (Number(args[1]) <= 12 && Number(args[1]) > 0) {
                    month = Number(args[1]);
                    weekDay = moment(Number(args[0]) + ' ' + month, 'DD MM').day();
                } else {
                    return context.reply('Месяц может быть только от 1 до 12');
                }
            }

            if (Number.isNaN(weekDay)) {
                return context.reply('В указанном месяце отсутствует число ' + args[0]);
            }

            const isWeekEven = TimeConverter.isEvenWeek(moment(dayOfMonth + ' ' + month, 'DD MM'));

            const message = [
                `👌 Расписание уроков на ${moment(dayOfMonth + ' ' + month, 'DD MM').format('dddd DD MMM')} [${isWeekEven ? 'четн.' : 'нечетн.'}]\n`
            ];

            const currentSchedule: any = await schedules.find({ subjectDay: weekDay, isEven: isWeekEven }).sort({ subjectTime: 1 }).exec();
            if (currentSchedule.length <= 0) {
                return context.reply('В данный день уроки отсутствуют 🙌😊');
            }

            for (const schedule of currentSchedule) {
                let subject: any = await subjects.findOne({ subjectId: schedule.subjectId }).exec();
                console.log(subject);

                const replacement: any = await replacements.findOne({
                    replacedSchedule: schedule.scheduleId,
                    date: moment().format('DD.MM.YYYY')
                }).exec();
                console.log(replacement);
                if (replacement !== null) {
                    subject = await subjects.findOne({subjectId: replacement.replacingSubject}).exec();
                }

                const subjectTime: any = await subjectTimes.findOne({ timeId: schedule.subjectTime }).exec();
                message.push([
                    `🔸 ${subject.name} (#${subject.subjectId}) ${replacement !== null ? '(Замена)' : ''}`,
                    `⠀⌚ Урок идет с ${subjectTime.timeStarts} по ${subjectTime.timeEnds}`,
                    `⠀🧭 Кабинет: ${subject.location}`,
                    `⠀🧑‍ Преподаватель: ${subject.teacher}`,
                    `⠀🔍 Номер предмета в базе: ${subject.subjectId}\n`
                ].join('\n'))
            };

            context.reply(message.join('\n'));
    }
}