const Review = require('./../models/reviewModel');
const catchAsync = require('./../utils/catchAsync');

exports.creatReview = catchAsync(async(req, res, next) => {
    // Allow nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    const newReview = await Review.create(req.body);
    res.status(201).json({
        status: 'success',

        data: {
            review: newReview
        }
    });
});

exports.getAllReview = catchAsync(async(req, res, next) => {
    const populateTourQuery = { path: 'tour', select: '-__v' }
    const populateUserQuery = { path: 'user', select: '-passwordChangedAt -lastLoginDate -__v' };
    // const review = await Review.find()
    //     .populate({ path: 'tour', select: '-__v -description' })
    //     .populate({ path: 'user', select: '-__v -name' }).lean();
    console.log('reviews get con');
    const review = await Review.find();
    //  .populate(populateTourQuery).populate(populateUserQuery).lean();

    // SEND RESPONSE
    res.status(200).json({
        status: 'success',
        results: review.length,
        data: {
            review
        }
    });
});