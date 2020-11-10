const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const router = express.Router();

router
    .route('/singup')
    .post(authController.singUp);

router
    .route('/forgotPassWord')
    .post(authController.forgotPassWord);

router
    .route('/resetPassWord/:token')
    .patch(authController.resetPassWord);

router
    .route('/updateMyPassWord')
    .post(authController.upDatePassWord);

router
    .route('/updatePassWordLogin')
    .patch(authController.protect, authController.updatePasswordWithLogin);

router
    .route('/updateUserData')
    .patch(authController.protect, authController.restrictTo('lead-guide', 'admin'), userController.updateUserData);

router
    .route('/login')
    .post(authController.login);

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(userController.getUser)
    //.patch(authController.protect, userController.updateUserData)
    .delete(userController.deleteUser);

module.exports = router;