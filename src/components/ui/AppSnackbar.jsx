import React from 'react';
import {Alert} from '@mui/material';
import {enqueueSnackbar} from 'notistack';

const buildAlertContent =
    (severity = 'info') =>
        (key, message) => (
            <Alert
                variant="filled"
                severity={severity}
                sx={{width: '100%'}}
            >
                {message}
            </Alert>
        );

export const showSuccessSnackbar = (message, options = {}) => {
    enqueueSnackbar(message, {
        autoHideDuration: 3000,
        ...options,
        content: buildAlertContent('success'),
    });
};

export const showErrorSnackbar = (message, options = {}) => {
    enqueueSnackbar(message, {
        autoHideDuration: 3000,
        ...options,
        content: buildAlertContent('error'),
    });
};

export const showInfoSnackbar = (message, options = {}) => {
    enqueueSnackbar(message, {
        autoHideDuration: 3000,
        ...options,
        content: buildAlertContent('info'),
    });
};

