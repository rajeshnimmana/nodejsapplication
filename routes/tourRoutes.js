const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewController = require('./../controllers/reviewController');
const router = express.Router();

//router.param('id', tourController.checkID);


router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);



router
    .route('/')
    // .get(authController.protect, tourController.getAllTours)
    .get(tourController.getAllTours)
    .post(tourController.createTour);

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(tourController.updateTour)
    .delete(authController.protect, authController.restrictTo('lead-guide', 'admin'), tourController.deleteTour);


router
    .route('/:tourId/review')
    .post(authController.protect, authController.restrictTo('user'), reviewController.creatReview);
module.exports = router;