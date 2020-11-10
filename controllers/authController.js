const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const { promisify } = require('util');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');


const signToken = (id, SECRET) => {
    return jwt.sign({ id }, SECRET, {
        expiresIn: process.env.JWT_EXPIRE_IN
    })
}

exports.singUp = catchAsync(async(req, res, next) => {


    const newUser = await User.create(req.body);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    // Remove password from output
    newUser.password = undefined;

    const token = signToken(newUser._id, process.env.JWT_SECRET);
    res.cookie('jwt', token, cookieOptions);

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: newUser
        }
    });
    // } catch (err) {
    //     const { email } = req.body;
    //     console.log('try block is entered');
    //     const user = await User.findOne({ email }).select('+password');
    //     if (user.email) {
    //         const delectUser = await User.findByIdAndDelete(user.id)
    //     }
    //     return next(new AppError('Something went wrong please try agian', 400));
    // }

});

exports.login = async(req, res, next) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return next(new AppError('Please Provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    console.log('get user data form data base   :' + user);

    if (user == null) {
        return next(new AppError('User is not available in Database', 401));
    }
    const getLastLoginDateTime = user.lastLoginDate;
    const validatePassWord = await user.correctPassWord(password, user.password);
    console.log('check user :' + validatePassWord);
    if (!validatePassWord || !user) {
        return next(new AppError('User email or password is mismatch', 401));
    }


    const lastVisted = await User.findByIdAndUpdate(user._id, {
        $set: { 'lastLoginDate': Date.now() },
        new: true,
        runValidators: true
    });
    console.log('update lastvisted' + lastVisted);




    const token = signToken(user._id, process.env.JWT_SECRET);
    res.status(201).json({
        status: 'success',
        token,
        getLastLoginDateTime

    });
};


exports.protect = catchAsync(async(req, res, next) => {
    let token = '';
    // 1) Getting token and check of it's there
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // console.log('token Data   ' + token);
    if (!token) {
        return next(new AppError('you are out log in please try again', 401));
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    //3) check if user still exit
    if (!currentUser) {
        return next(new AppError('This user is does not exists.', 401));
    }
    console.log(decoded);



    // 4) check if user changed after the token was issue.
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError('User recently changed password! Please log in again.', 401)
        );
    }

    req.user = currentUser;

    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You have on access to delect or update the records', 401));
        }
        next();
    };

};

exports.forgotPassWord = catchAsync(async(req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    console.log('resetToken' + resetToken)
    await user.save({ validateBeforeSave: false });
    //await user.save();

    const resetURL = `${req.protocol}://${req.get(
        'host'
      )}/api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    // try {
    // await sendEmail({
    //     email: user.email,
    //     subject: 'Your password reset token (valid for 10 min)',
    //     message
    // });

    res.status(200).json({
        status: 'success',
        message: 'Token sent to email!',
        resetToken
    });
    // } catch (err) {
    //     user.passwordResetToken = undefined;
    //     user.passwordResetExpires = undefined;
    //     await user.save({ validateBeforeSave: false });

    //     return next(
    //         new AppError('There was an error sending the email. Try again later!'),
    //         500
    //     );
    // }


});

exports.resetPassWord = catchAsync(async(req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const token = signToken(user._id, process.env.JWT_SECRET);
    res.status(201).json({
        status: 'success',
        token

    });
});


exports.upDatePassWord = catchAsync(async(req, res, next) => {

    const { email, currentPassWord, password, passwordConfirm } = req.body;
    const verifyUser = await await User.findOne({ email }).select('+password');

    if (!verifyUser) {
        return next(new AppError('There is no user with email address.', 404));
    }
    console.log(currentPassWord + 'currentPassWord');
    console.log(verifyUser + 'verifyUser.password');
    const validatePassWord = await verifyUser.correctPassWord(currentPassWord, verifyUser.password);
    console.log(validatePassWord + 'validatePassWord');
    if (!validatePassWord || !verifyUser) {
        return next(new AppError('User email or password is mismatch', 401));
    }
    console.log('uddatePassWord start');
    verifyUser.password = password;
    verifyUser.passwordConfirm = passwordConfirm;
    // const uddatePassWord = await User.findByIdAndUpdate(verifyUser._id, {
    //     $set: { 'password': upDatePassWord },
    //     new: true,
    //     runValidators: true
    // });
    await verifyUser.save();
    console.log('uddatePassWord end');
    const token = signToken(verifyUser._id, process.env.JWT_SECRET);
    res.status(201).json({
        status: 'success',
        token

    });

});

exports.updatePasswordWithLogin = catchAsync(async(req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    console.log(user + 'user')
    console.log(req.body.currentPassWord + 'req.body.currentPassWord')
        // 2) Check if POSTed current password is correct
    const validatePassWord = await user.correctPassWord(req.body.currentPassWord, user.password);
    console.log(validatePassWord + 'validatePassWord');
    if (!validatePassWord) {
        return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // User.findByIdAndUpdate will NOT work as intended!

    // 4) Log user in, send JWT
    const token = signToken(user._id, process.env.JWT_SECRET);
    res.status(201).json({
        status: 'success',
        token

    });

});