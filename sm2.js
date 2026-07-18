export function sm2(card, quality) {
    let { interval, repetition, easeFactor } = card;

    if (quality < 3) {
        repetition = 0;
        interval = 1;
    } else {
        repetition += 1;
        if (repetition === 1) interval = 1;
        else if (repetition === 2) interval = 6;
        else interval = Math.round(interval * easeFactor);

        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (easeFactor < 1.3) easeFactor = 1.3;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return { interval, repetition, easeFactor, dueDate };
}