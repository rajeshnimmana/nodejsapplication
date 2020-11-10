const express = require('express');
const reviewController = require('./../controllers/reviewController');
const router = express.Router();


router
    .route('/')
    .get(reviewController.getAllReview)
    .post(reviewController.creatReview);


module.exports = router