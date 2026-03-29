/** MUI `sx` dùng chung cho ChildrenInfoPage */

export const sectionLabelSx = {
    fontSize: 14,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.65,
    mb: 0.75,
};

export const detailPanelSx = {
    borderRadius: 1.5,
    bgcolor: 'rgba(255, 255, 255, 0.55)',
    border: '1px solid rgba(191, 219, 254, 0.45)',
    p: 1.75,
};

export const glassCardSx = {
    borderRadius: 3,
    border: '1px solid rgba(255, 255, 255, 0.55)',
    boxShadow:
        '0 4px 24px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(191, 219, 254, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
    overflow: 'hidden',
    bgcolor: 'rgba(255, 255, 255, 0.52)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
};

export const glassCardSxMt = {...glassCardSx, mt: 3};

export const cardContentPaddingSx = {
    p: {xs: 2.5, sm: 3.25},
    '&:last-child': {pb: {xs: 2.5, sm: 3.25}},
};

export const sectionHeadingSx = {
    fontWeight: 800,
    fontSize: {xs: 17, sm: 18},
    color: '#1e293b',
    letterSpacing: -0.02,
    mb: 0.5,
};

export const sectionAccentBarSx = {
    width: 44,
    height: 3,
    borderRadius: 999,
    background: 'linear-gradient(90deg, #2563eb 0%, #38bdf8 100%)',
    mb: 2,
};

export const pageShellSx = {
    pt: '90px',
    minHeight: '100vh',
    pb: 5,
    background:
        'linear-gradient(165deg, rgba(224, 242, 254, 0.92) 0%, rgba(186, 230, 253, 0.78) 40%, rgba(147, 197, 253, 0.65) 100%)',
};

export const backButtonSx = {
    textTransform: 'none',
    color: '#2563eb',
    fontSize: 15,
    borderRadius: 999,
    px: 1.25,
    py: 0.65,
    '&:hover': {bgcolor: 'rgba(37, 99, 235, 0.08)'},
};

export const editSaveButtonSx = {
    textTransform: 'none',
    fontWeight: 700,
    borderRadius: 2,
    px: 2.5,
    py: 1,
    minWidth: 120,
    alignSelf: {xs: 'flex-end', sm: 'flex-start'},
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
};

export const formTextFieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        bgcolor: 'rgba(239, 246, 255, 0.9)',
        backdropFilter: 'blur(6px)',
    },
};

export const gradeTextFieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1.25,
        bgcolor: 'rgba(255, 255, 255, 0.9)',
    },
};

export const personalityTestAlertSx = {
    mt: 3,
    alignItems: 'flex-start',
    borderRadius: 2,
    bgcolor: '#f8fafc',
    borderColor: '#e2e8f0',
    color: '#334155',
    py: 1.5,
    px: 1.5,
    '& .MuiAlert-icon': {
        color: '#2563eb',
        opacity: 1,
        pt: 0.25,
    },
    '& .MuiAlert-message': {
        width: '100%',
        paddingTop: 0,
    },
};

export const mbtiRadioSx = {
    p: '4px',
    color: '#2563eb',
    '& .MuiSvgIcon-root': {
        fontSize: 16,
    },
    '&.Mui-checked': {
        color: '#2563eb',
    },
};
