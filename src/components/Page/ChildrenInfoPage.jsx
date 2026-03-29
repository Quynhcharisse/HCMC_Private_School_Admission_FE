import React from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    Link,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import {Add, ArrowBack} from '@mui/icons-material';
import {emptyGrades, genderOptions, GRADE_LEVELS} from './childrenInfo/childrenInfoHelpers.js';
import {
    backButtonSx,
    cardContentPaddingSx,
    detailPanelSx,
    editSaveButtonSx,
    formTextFieldSx,
    glassCardSx,
    glassCardSxMt,
    gradeTextFieldSx,
    mbtiRadioSx,
    pageShellSx,
    personalityTestAlertSx,
    sectionAccentBarSx,
    sectionHeadingSx,
    sectionLabelSx,
} from './childrenInfo/childrenInfoStyles.js';
import {useChildrenInfoPage} from './childrenInfo/useChildrenInfoPage.js';

export default function ChildrenInfoPage() {
    const {
        navigate,
        loading,
        editMode,
        saving,
        form,
        fieldsDisabled,
        personalityGroups,
        personalityLoading,
        selectedPersonalityId,
        selectedPersonality,
        personalityListScrollRef,
        majorGroups,
        majorsLoading,
        favoriteMajorCodes,
        subjectGroupsLoading,
        regularSubjects,
        foreignSubjects,
        regularGrades,
        foreignRows,
        foreignGrades,
        studentRecords,
        activeStudentTab,
        creatingNewStudent,
        handleSelectStudentTab,
        handleAddStudentTab,
        handleChange,
        handlePersonalityListScroll,
        handlePersonalityChange,
        handleFavoriteMajorChange,
        handleRegularGradeChange,
        handleForeignGradeChange,
        handleForeignSubjectChange,
        addForeignLanguageRow,
        foreignOptionsForRow,
        enterEditMode,
        handleSave,
    } = useChildrenInfoPage();

    return (
        <Box sx={pageShellSx}>
            <Box sx={{maxWidth: 1200, mx: 'auto', px: {xs: 2, md: 4}}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 2}}>
                    <Button startIcon={<ArrowBack/>} onClick={() => navigate(-1)} sx={backButtonSx}>
                        Quay lại
                    </Button>
                </Box>
                <Box
                    sx={{
                        mb: 3,
                        display: 'flex',
                        flexDirection: {xs: 'column', sm: 'row'},
                        alignItems: {xs: 'stretch', sm: 'flex-start'},
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Box sx={{flex: 1, minWidth: 0}}>
                        <Typography
                            sx={{
                                fontWeight: 800,
                                fontSize: {xs: 26, sm: 30},
                                color: '#1e293b',
                                letterSpacing: -0.03,
                                lineHeight: 1.15,
                                mb: 1,
                            }}
                        >
                            Thông tin con
                        </Typography>
                        <Typography
                            sx={{
                                color: 'rgba(30, 64, 175, 0.85)',
                                fontSize: {xs: 15, sm: 16},
                                maxWidth: 560,
                                lineHeight: 1.55,
                                mb: 1.75,
                            }}
                        >
                            Cập nhật thông tin học sinh liên kết với tài khoản phụ huynh.
                        </Typography>
                        <Box
                            sx={{
                                height: 4,
                                width: {xs: 72, sm: 88},
                                borderRadius: 999,
                                background:
                                    'linear-gradient(90deg, #2563eb 0%, #38bdf8 55%, rgba(56, 189, 248, 0.35) 100%)',
                            }}
                        />
                    </Box>
                    {!loading && !editMode && (
                        <Button variant="contained" onClick={enterEditMode} sx={editSaveButtonSx}>
                            Chỉnh sửa
                        </Button>
                    )}
                </Box>
                <Divider sx={{mb: 2, borderColor: 'rgba(148, 163, 184, 0.35)'}}/>
                {!loading && (
                    <Box sx={{mb: 2, overflowX: 'auto'}}>
                        <Tabs
                            value={creatingNewStudent ? 'add' : activeStudentTab}
                            onChange={(_, value) => {
                                if (value === 'add') handleAddStudentTab();
                                else handleSelectStudentTab(Number(value));
                            }}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 44,
                                px: 0.5,
                                '& .MuiTabs-flexContainer': {
                                    gap: 0.6,
                                },
                                '& .MuiTabs-indicator': {
                                    display: 'none',
                                },
                            }}
                        >
                            {studentRecords.map((s, idx) => (
                                <Tab
                                    key={s?.id ?? `student-${idx}`}
                                    value={idx}
                                    label={s?.studentName || s?.name || `Con ${idx + 1}`}
                                    sx={{
                                        minHeight: 44,
                                        minWidth: 130,
                                        px: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: '14px 14px 0 0',
                                        bgcolor: 'rgba(226, 232, 240, 0.75)',
                                        color: '#475569',
                                        border: '1px solid rgba(148, 163, 184, 0.35)',
                                        borderBottom: 'none',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: 'rgba(219, 234, 254, 0.58)',
                                            color: '#2563eb',
                                        },
                                        '&.Mui-selected': {
                                            bgcolor: '#f8fbff',
                                            color: '#1e293b',
                                            fontWeight: 700,
                                            borderColor: 'rgba(59, 130, 246, 0.35)',
                                            boxShadow:
                                                '0 -2px 12px rgba(37, 99, 235, 0.16), 0 0 0 1px rgba(191, 219, 254, 0.7) inset',
                                        },
                                    }}
                                />
                            ))}
                            <Tab
                                value="add"
                                icon={<Add fontSize="small"/>}
                                iconPosition="start"
                                label="Thêm"
                                sx={{
                                    minHeight: 44,
                                    minWidth: 110,
                                    px: 1.8,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '14px 14px 0 0',
                                    background:
                                        'linear-gradient(180deg, rgba(224, 242, 254, 0.95) 0%, rgba(219, 234, 254, 0.95) 100%)',
                                    color: '#2563eb',
                                    border: '1px dashed rgba(37, 99, 235, 0.5)',
                                    borderBottom: 'none',
                                    '&:hover': {
                                        background:
                                            'linear-gradient(180deg, rgba(219, 234, 254, 1) 0%, rgba(191, 219, 254, 0.95) 100%)',
                                        color: '#2563eb',
                                    },
                                    '&.Mui-selected': {
                                        background:
                                            'linear-gradient(180deg, rgba(191, 219, 254, 0.95) 0%, rgba(147, 197, 253, 0.9) 100%)',
                                        color: '#2563eb',
                                    },
                                }}
                            />
                        </Tabs>
                    </Box>
                )}

                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 8}}>
                        <CircularProgress sx={{color: '#2563eb'}}/>
                    </Box>
                ) : (
                    <Card sx={glassCardSx}>
                        <CardContent sx={cardContentPaddingSx}>
                            <Typography sx={sectionHeadingSx}>Thông tin cá nhân</Typography>
                            <Box sx={sectionAccentBarSx}/>
                            <Grid container rowSpacing={2} columnSpacing={{xs: 2, sm: 3}}>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <TextField
                                        label="Họ và tên"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        fullWidth
                                        size="medium"
                                        placeholder="Nhập họ và tên"
                                        disabled={fieldsDisabled}
                                        sx={formTextFieldSx}
                                    />
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}}>
                                    <TextField
                                        select
                                        label="Giới tính"
                                        name="gender"
                                        value={form.gender}
                                        onChange={handleChange}
                                        fullWidth
                                        size="medium"
                                        disabled={fieldsDisabled}
                                        sx={formTextFieldSx}
                                    >
                                        <MenuItem value="">
                                            <em>Chọn giới tính</em>
                                        </MenuItem>
                                        {genderOptions.map((o) => (
                                            <MenuItem key={o.value} value={o.value}>
                                                {o.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                )}

                {!loading && (
                    <>
                    <Card sx={glassCardSxMt}>
                        <CardContent sx={cardContentPaddingSx}>
                            <Typography sx={sectionHeadingSx}>Nhóm tính cách</Typography>
                            <Typography sx={{fontSize: 14, color: '#64748b', mb: 1.5, lineHeight: 1.55}}>
                                Chọn loại MBTI phù hợp — trích dẫn, ảnh minh họa và đặc điểm sẽ cập nhật tương ứng.
                            </Typography>
                            <Box sx={sectionAccentBarSx}/>
                            <Grid
                                container
                                rowSpacing={1.75}
                                columnSpacing={{xs: 1.75, sm: 2.5}}
                                sx={{alignItems: 'stretch'}}
                            >
                                <Grid size={{xs: 12, sm: 6}} sx={{display: 'flex', flexDirection: 'column'}}>
                                    <Box
                                        sx={{
                                            flex: 1,
                                            width: '100%',
                                            minHeight: {xs: 280, sm: 360},
                                            maxHeight: {xs: 'none', sm: 'min(82vh, 1100px)'},
                                            p: 1.75,
                                            borderRadius: 2,
                                            border: '1px solid rgba(147, 197, 253, 0.5)',
                                            bgcolor: 'rgba(239, 246, 255, 0.75)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                fontSize: 15,
                                                color: '#2563eb',
                                                mb: 0.75,
                                            }}
                                        >
                                            Loại tính cách (MBTI)
                                        </Typography>
                                        {personalityLoading ? (
                                            <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                                                <CircularProgress size={32} sx={{color: '#2563eb'}}/>
                                            </Box>
                                        ) : !personalityGroups ? (
                                            <Typography sx={{fontSize: 14, color: '#64748b'}}>
                                                Không có dữ liệu loại tính cách.
                                            </Typography>
                                        ) : (
                                            <>
                                                <Box
                                                    ref={personalityListScrollRef}
                                                    onScroll={handlePersonalityListScroll}
                                                    sx={{
                                                        maxHeight: 248,
                                                        overflowY: 'auto',
                                                        pr: 0.5,
                                                        mr: -0.5,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <FormControl
                                                        component="fieldset"
                                                        variant="standard"
                                                        fullWidth
                                                        disabled={fieldsDisabled}
                                                    >
                                                        <RadioGroup
                                                            value={selectedPersonalityId}
                                                            onChange={handlePersonalityChange}
                                                        >
                                                            {Object.entries(personalityGroups).map(
                                                                ([groupName, items]) => (
                                                                    <Box key={groupName} sx={{mb: 1.15}}>
                                                                        <Typography
                                                                            sx={{
                                                                                fontSize: 14,
                                                                                fontWeight: 700,
                                                                                color: '#64748b',
                                                                                textTransform: 'uppercase',
                                                                                letterSpacing: 0.55,
                                                                                mb: 0.5,
                                                                            }}
                                                                        >
                                                                            {groupName}
                                                                        </Typography>
                                                                        {Array.isArray(items) &&
                                                                            items.map((item) => (
                                                                                <FormControlLabel
                                                                                    key={item.id}
                                                                                    value={String(item.id)}
                                                                                    disabled={fieldsDisabled}
                                                                                    sx={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        ml: 0,
                                                                                        mb: 0.35,
                                                                                        gap: 0.25,
                                                                                        '& .MuiButtonBase-root': {
                                                                                            alignSelf: 'center',
                                                                                        },
                                                                                        '& .MuiFormControlLabel-label': {
                                                                                            pt: 0,
                                                                                            lineHeight: 1.35,
                                                                                        },
                                                                                    }}
                                                                                    control={
                                                                                        <Radio
                                                                                            size="small"
                                                                                            disabled={fieldsDisabled}
                                                                                            sx={mbtiRadioSx}
                                                                                        />
                                                                                    }
                                                                                    label={
                                                                                        <Typography
                                                                                            component="span"
                                                                                            sx={{
                                                                                                fontSize: 15,
                                                                                                lineHeight: 1.35,
                                                                                                color: '#1e293b',
                                                                                            }}
                                                                                        >
                                                                                            <Box
                                                                                                component="span"
                                                                                                sx={{
                                                                                                    fontWeight: 700,
                                                                                                    color: '#2563eb',
                                                                                                }}
                                                                                            >
                                                                                                {item.code}
                                                                                            </Box>
                                                                                            {' — '}
                                                                                            {item.name}
                                                                                        </Typography>
                                                                                    }
                                                                                />
                                                                            ))}
                                                                    </Box>
                                                                ),
                                                            )}
                                                        </RadioGroup>
                                                    </FormControl>
                                                </Box>
                                                <Box
                                                    sx={{
                                                        mt: 1.5,
                                                        pt: 1.5,
                                                        flex: 1,
                                                        minHeight: 0,
                                                        borderTop: '1px solid rgba(147, 197, 253, 0.45)',
                                                    }}
                                                >
                                                    <Typography sx={{...sectionLabelSx, mb: 0.65}}>
                                                        Đặc điểm
                                                    </Typography>
                                                    {!selectedPersonality ? (
                                                        <Typography sx={{fontSize: 14, color: '#64748b'}}>
                                                            Đặc điểm chi tiết sẽ hiển thị theo loại MBTI bạn chọn.
                                                        </Typography>
                                                    ) : !selectedPersonality.traits?.length ? (
                                                        <Typography sx={{fontSize: 14, color: '#64748b'}}>
                                                            Loại này chưa có dữ liệu traits.
                                                        </Typography>
                                                    ) : (
                                                        <Stack spacing={1}>
                                                            {selectedPersonality.traits.map((trait) => (
                                                                <Box
                                                                    key={`${trait.name}-${trait.description?.slice(0, 24)}`}
                                                                    sx={{
                                                                        pl: 1.15,
                                                                        borderLeft: '2px solid rgba(147, 197, 253, 0.85)',
                                                                        py: 0.15,
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: 14,
                                                                            fontWeight: 700,
                                                                            color: '#1e293b',
                                                                            mb: 0.35,
                                                                            lineHeight: 1.35,
                                                                        }}
                                                                    >
                                                                        {trait.name}
                                                                    </Typography>
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: 14,
                                                                            color: '#64748b',
                                                                            lineHeight: 1.6,
                                                                        }}
                                                                    >
                                                                        {trait.description}
                                                                    </Typography>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            </>
                                        )}
                                    </Box>
                                </Grid>
                                <Grid size={{xs: 12, sm: 6}} sx={{display: 'flex', flexDirection: 'column'}}>
                                    <Box
                                        sx={{
                                            flex: 1,
                                            width: '100%',
                                            minHeight: {xs: 280, sm: 360},
                                            maxHeight: {xs: 'none', sm: 'min(82vh, 1100px)'},
                                            p: 1.75,
                                            borderRadius: 2,
                                            border: '1px solid rgba(147, 197, 253, 0.5)',
                                            bgcolor: 'rgba(239, 246, 255, 0.75)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                flex: 1,
                                                minHeight: 0,
                                                overflowY: {xs: 'visible', sm: 'auto'},
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                        {!selectedPersonality ? (
                                            <Typography sx={{fontSize: 14, color: '#64748b', lineHeight: 1.6}}>
                                                Trích dẫn và ảnh minh họa sẽ hiển thị theo loại MBTI bạn chọn.
                                            </Typography>
                                        ) : (
                                            <Stack spacing={1.25} sx={{width: '100%', pt: 0.25}}>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: {xs: 'column', sm: 'row'},
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: {xs: 1.5, sm: 2},
                                                        py: {xs: 0.5, sm: 1},
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            textAlign: 'center',
                                                            px: {xs: 0.5, sm: 1},
                                                        }}
                                                    >
                                                        {selectedPersonality.quote?.content ? (
                                                            <Box
                                                                component="blockquote"
                                                                sx={{m: 0, p: 0, border: 'none'}}
                                                            >
                                                                <Typography
                                                                    sx={{
                                                                        fontSize: 15,
                                                                        fontStyle: 'italic',
                                                                        color: '#334155',
                                                                        lineHeight: 1.65,
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    “{selectedPersonality.quote.content}”
                                                                </Typography>
                                                                {selectedPersonality.quote.author ? (
                                                                    <Typography
                                                                        sx={{
                                                                            fontSize: 14,
                                                                            color: '#64748b',
                                                                            fontWeight: 600,
                                                                        }}
                                                                    >
                                                                        — {selectedPersonality.quote.author}
                                                                    </Typography>
                                                                ) : null}
                                                            </Box>
                                                        ) : (
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 14,
                                                                    color: '#64748b',
                                                                    textAlign: 'center',
                                                                }}
                                                            >
                                                                Loại này chưa có dữ liệu trích dẫn.
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    {selectedPersonality.image ? (
                                                        <Box
                                                            component="img"
                                                            src={selectedPersonality.image}
                                                            alt={
                                                                selectedPersonality.code
                                                                    ? `Ảnh minh họa ${selectedPersonality.code}${
                                                                          selectedPersonality.name
                                                                              ? ` — ${selectedPersonality.name}`
                                                                              : ''
                                                                      }`
                                                                    : 'Ảnh minh họa loại tính cách'
                                                            }
                                                            sx={{
                                                                flexShrink: 0,
                                                                alignSelf: 'center',
                                                                width: 'auto',
                                                                height: 'auto',
                                                                maxWidth: {xs: 104, sm: 112},
                                                                maxHeight: {xs: 160, sm: 188},
                                                                objectFit: 'contain',
                                                                borderRadius: 1.5,
                                                                display: 'block',
                                                                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)',
                                                                border: '1px solid rgba(191, 219, 254, 0.75)',
                                                            }}
                                                        />
                                                    ) : null}
                                                </Box>

                                                {selectedPersonality.description ? (
                                                    <>
                                                        <Divider sx={{borderColor: 'rgba(191, 219, 254, 0.55)'}}/>
                                                        <Box sx={{...detailPanelSx, py: 1.25}}>
                                                            <Typography sx={sectionLabelSx}>Mô tả</Typography>
                                                            <Typography
                                                                sx={{
                                                                    fontSize: 14,
                                                                    color: '#475569',
                                                                    lineHeight: 1.65,
                                                                }}
                                                            >
                                                                {selectedPersonality.description}
                                                            </Typography>
                                                        </Box>
                                                    </>
                                                ) : null}

                                                {(selectedPersonality.strengths?.length > 0 ||
                                                    selectedPersonality.weaknesses?.length > 0) && (
                                                    <>
                                                        <Divider sx={{borderColor: 'rgba(191, 219, 254, 0.55)'}}/>
                                                        <Box>
                                                            <Typography sx={{...sectionLabelSx, mb: 1}}>
                                                                Đặc điểm tính cách
                                                            </Typography>
                                                            <Grid container spacing={1.25}>
                                                                {selectedPersonality.strengths?.length > 0 ? (
                                                                    <Grid
                                                                        size={{
                                                                            xs: 12,
                                                                            md:
                                                                                selectedPersonality.weaknesses?.length > 0
                                                                                    ? 6
                                                                                    : 12,
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                ...detailPanelSx,
                                                                                height: '100%',
                                                                                py: 1.25,
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                sx={{
                                                                                    fontSize: 14,
                                                                                    fontWeight: 700,
                                                                                    color: '#15803d',
                                                                                    mb: 0.65,
                                                                                }}
                                                                            >
                                                                                Ưu điểm
                                                                            </Typography>
                                                                            <Box
                                                                                component="ul"
                                                                                sx={{
                                                                                    m: 0,
                                                                                    pl: 2,
                                                                                    '& li': {mb: 0.45},
                                                                                }}
                                                                            >
                                                                                {selectedPersonality.strengths.map(
                                                                                    (line, idx) => (
                                                                                        <Typography
                                                                                            key={`s-${idx}`}
                                                                                            component="li"
                                                                                            sx={{
                                                                                                fontSize: 14,
                                                                                                color: '#334155',
                                                                                                lineHeight: 1.55,
                                                                                            }}
                                                                                        >
                                                                                            {line}
                                                                                        </Typography>
                                                                                    ),
                                                                                )}
                                                                            </Box>
                                                                        </Box>
                                                                    </Grid>
                                                                ) : null}
                                                                {selectedPersonality.weaknesses?.length > 0 ? (
                                                                    <Grid
                                                                        size={{
                                                                            xs: 12,
                                                                            md:
                                                                                selectedPersonality.strengths?.length > 0
                                                                                    ? 6
                                                                                    : 12,
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                ...detailPanelSx,
                                                                                height: '100%',
                                                                                py: 1.25,
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                sx={{
                                                                                    fontSize: 14,
                                                                                    fontWeight: 700,
                                                                                    color: '#b45309',
                                                                                    mb: 0.65,
                                                                                }}
                                                                            >
                                                                                Nhược điểm
                                                                            </Typography>
                                                                            <Box
                                                                                component="ul"
                                                                                sx={{
                                                                                    m: 0,
                                                                                    pl: 2,
                                                                                    '& li': {mb: 0.45},
                                                                                }}
                                                                            >
                                                                                {selectedPersonality.weaknesses.map(
                                                                                    (line, idx) => (
                                                                                        <Typography
                                                                                            key={`w-${idx}`}
                                                                                            component="li"
                                                                                            sx={{
                                                                                                fontSize: 14,
                                                                                                color: '#334155',
                                                                                                lineHeight: 1.55,
                                                                                            }}
                                                                                        >
                                                                                            {line}
                                                                                        </Typography>
                                                                                    ),
                                                                                )}
                                                                            </Box>
                                                                        </Box>
                                                                    </Grid>
                                                                ) : null}
                                                            </Grid>
                                                        </Box>
                                                    </>
                                                )}

                                                {selectedPersonality.recommendedCareers?.length > 0 ? (
                                                    <>
                                                        <Divider sx={{borderColor: 'rgba(191, 219, 254, 0.55)'}}/>
                                                        <Box>
                                                            <Typography sx={{...sectionLabelSx, mb: 1}}>
                                                                Nghề nghiệp phù hợp
                                                            </Typography>
                                                            <Stack spacing={1}>
                                                                {selectedPersonality.recommendedCareers.map(
                                                                    (career, idx) => (
                                                                        <Box
                                                                            key={`${career.name}-${idx}`}
                                                                            sx={{
                                                                                ...detailPanelSx,
                                                                                p: 1.25,
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                sx={{
                                                                                    fontSize: 14,
                                                                                    fontWeight: 600,
                                                                                    color: '#2563eb',
                                                                                    mb: 0.35,
                                                                                    lineHeight: 1.35,
                                                                                }}
                                                                            >
                                                                                {career.name}
                                                                            </Typography>
                                                                            {career.explainText ? (
                                                                                <Typography
                                                                                    sx={{
                                                                                        fontSize: 14,
                                                                                        color: '#64748b',
                                                                                        lineHeight: 1.55,
                                                                                    }}
                                                                                >
                                                                                    {career.explainText}
                                                                                </Typography>
                                                                            ) : null}
                                                                        </Box>
                                                                    ),
                                                                )}
                                                            </Stack>
                                                        </Box>
                                                    </>
                                                ) : null}
                                            </Stack>
                                        )}
                                        </Box>
                                        <Box
                                            sx={{
                                                flexShrink: 0,
                                                pt: 1.75,
                                                borderTop: '1px solid rgba(147, 197, 253, 0.45)',
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    color: '#64748b',
                                                    textAlign: {xs: 'center', sm: 'right'},
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                Khai thác bởi:{' '}
                                                <Link
                                                    href="https://mbti.vn/"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    sx={{
                                                        color: '#2563eb',
                                                        fontWeight: 600,
                                                        wordBreak: 'break-all',
                                                    }}
                                                >
                                                    mbti.vn
                                                </Link>
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>
                            <Alert severity="info" variant="outlined" sx={personalityTestAlertSx}>
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        color: '#475569',
                                        lineHeight: 1.65,
                                        mb: 1.25,
                                    }}
                                >
                                    Nếu bạn muốn kiểm tra bạn thuộc nhóm tính cách nào, hãy làm bài test thông qua
                                    những trang web này:
                                </Typography>
                                <Stack component="ul" spacing={0.75} sx={{m: 0, pl: 2.25, mb: 0}}>
                                    <Typography
                                        component="li"
                                        sx={{fontSize: 14, color: '#334155', '&::marker': {color: '#64748b'}}}
                                    >
                                        <Link
                                            href="https://www.16personalities.com/vi"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                color: '#2563eb',
                                                fontWeight: 500,
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            16personalities.com (Tiếng Việt)
                                        </Link>
                                    </Typography>
                                    <Typography
                                        component="li"
                                        sx={{fontSize: 14, color: '#334155', '&::marker': {color: '#64748b'}}}
                                    >
                                        <Link
                                            href="https://mbti.vn/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{color: '#2563eb', fontWeight: 500, wordBreak: 'break-all'}}
                                        >
                                            https://mbti.vn/
                                        </Link>
                                    </Typography>
                                </Stack>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card sx={glassCardSxMt}>
                        <CardContent sx={cardContentPaddingSx}>
                            <Typography sx={sectionHeadingSx}>Nghề nghiệp yêu thích</Typography>
                            <Typography sx={{fontSize: 14, color: '#64748b', mb: 1.5, lineHeight: 1.55}}>
                                Chọn một ngành đào tạo bạn quan tâm nhất.
                            </Typography>
                            <Box sx={sectionAccentBarSx}/>
                            {majorsLoading ? (
                                <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                                    <CircularProgress sx={{color: '#2563eb'}}/>
                                </Box>
                            ) : majorGroups.length === 0 ? (
                                <Typography sx={{fontSize: 14, color: '#64748b'}}>
                                    Chưa có dữ liệu ngành đào tạo.
                                </Typography>
                            ) : (
                                <Box
                                    sx={{
                                        maxHeight: {xs: 420, sm: 520},
                                        overflowY: 'auto',
                                        pr: 0.5,
                                        mr: -0.5,
                                    }}
                                >
                                    <FormControl component="fieldset" variant="standard" fullWidth>
                                        <RadioGroup
                                            value={
                                                favoriteMajorCodes.length
                                                    ? String(favoriteMajorCodes[0])
                                                    : ''
                                            }
                                            onChange={handleFavoriteMajorChange}
                                        >
                                            <Stack spacing={2.25}>
                                                {majorGroups.map((entry) => (
                                                    <Box
                                                        key={entry.group}
                                                        sx={{
                                                            position: 'relative',
                                                            pl: 1.75,
                                                            py: 2,
                                                            px: 2,
                                                            borderRadius: 2.5,
                                                            bgcolor: 'rgba(255, 255, 255, 0.42)',
                                                            border: '1px solid rgba(226, 232, 240, 0.85)',
                                                            boxShadow: '0 6px 22px rgba(15, 23, 42, 0.04)',
                                                            '&::before': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                left: 0,
                                                                top: 12,
                                                                bottom: 12,
                                                                width: 4,
                                                                borderRadius: '0 4px 4px 0',
                                                                background:
                                                                    'linear-gradient(180deg, #2563eb 0%, #38bdf8 55%, #7dd3fc 100%)',
                                                            },
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                fontSize: 11,
                                                                fontWeight: 800,
                                                                letterSpacing: 1.1,
                                                                textTransform: 'uppercase',
                                                                color: '#64748b',
                                                                mb: 1.5,
                                                            }}
                                                        >
                                                            {entry.group}
                                                        </Typography>
                                                        <Grid container spacing={1.25}>
                                                            {Array.isArray(entry.majors) &&
                                                                entry.majors.map((m) => {
                                                                    const codeNum = Number(m.code);
                                                                    const selected =
                                                                        favoriteMajorCodes.length > 0 &&
                                                                        favoriteMajorCodes[0] === codeNum;
                                                                    return (
                                                                        <Grid
                                                                            size={{xs: 12, sm: 6}}
                                                                            key={`${entry.group}-${m.code}`}
                                                                        >
                                                                            <FormControlLabel
                                                                                value={String(m.code)}
                                                                                disabled={fieldsDisabled}
                                                                                control={
                                                                                    <Radio
                                                                                        size="small"
                                                                                        sx={{
                                                                                            p: 0.5,
                                                                                            color: '#94a3b8',
                                                                                            alignSelf: 'center',
                                                                                            '&.Mui-checked': {
                                                                                                color: '#2563eb',
                                                                                            },
                                                                                        }}
                                                                                    />
                                                                                }
                                                                                label={
                                                                                    <Box sx={{minWidth: 0}}>
                                                                                        <Typography
                                                                                            component="span"
                                                                                            sx={{
                                                                                                display: 'inline-block',
                                                                                                fontSize: 11,
                                                                                                fontWeight: 800,
                                                                                                letterSpacing: 0.4,
                                                                                                color: '#2563eb',
                                                                                                mb: 0.35,
                                                                                            }}
                                                                                        >
                                                                                            {m.code}
                                                                                        </Typography>
                                                                                        <Typography
                                                                                            sx={{
                                                                                                fontSize: 14,
                                                                                                fontWeight: 500,
                                                                                                color: '#334155',
                                                                                                lineHeight: 1.45,
                                                                                            }}
                                                                                        >
                                                                                            {m.name}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                }
                                                                                sx={{
                                                                                    alignItems: 'center',
                                                                                    gap: 1.25,
                                                                                    m: 0,
                                                                                    width: '100%',
                                                                                    p: 1.5,
                                                                                    borderRadius: 2,
                                                                                    border: '1px solid',
                                                                                    borderColor: selected
                                                                                        ? 'rgba(37, 99, 235, 0.38)'
                                                                                        : 'rgba(226, 232, 240, 0.95)',
                                                                                    bgcolor: selected
                                                                                        ? 'rgba(37, 99, 235, 0.07)'
                                                                                        : 'rgba(248, 250, 252, 0.85)',
                                                                                    boxShadow: selected
                                                                                        ? '0 0 0 1px rgba(37, 99, 235, 0.12)'
                                                                                        : 'none',
                                                                                    transition:
                                                                                        'border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
                                                                                    '& .MuiFormControlLabel-label': {
                                                                                        flex: 1,
                                                                                        minWidth: 0,
                                                                                    },
                                                                                    ...(fieldsDisabled
                                                                                        ? {opacity: 0.92}
                                                                                        : {
                                                                                              '&:hover': {
                                                                                                  borderColor:
                                                                                                      'rgba(59, 130, 246, 0.45)',
                                                                                                  bgcolor: selected
                                                                                                      ? 'rgba(37, 99, 235, 0.09)'
                                                                                                      : 'rgba(255, 255, 255, 0.98)',
                                                                                                  boxShadow:
                                                                                                      '0 6px 18px rgba(37, 99, 235, 0.08)',
                                                                                              },
                                                                                          }),
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                    );
                                                                })}
                                                        </Grid>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </RadioGroup>
                                    </FormControl>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    <Card sx={glassCardSxMt}>
                        <CardContent sx={cardContentPaddingSx}>
                            <Typography sx={sectionHeadingSx}>Học bạ</Typography>
                            <Typography sx={{fontSize: 14, color: '#64748b', mb: 1.5, lineHeight: 1.55}}>
                                Điểm cả năm theo từng lớp (06–09). Phần ngoại ngữ: chọn ngôn ngữ và điền điểm; có thể
                                thêm dòng nếu học nhiều ngôn ngữ.
                            </Typography>
                            <Box sx={sectionAccentBarSx}/>
                            {subjectGroupsLoading ? (
                                <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}>
                                    <CircularProgress sx={{color: '#2563eb'}}/>
                                </Box>
                            ) : regularSubjects.length === 0 && foreignSubjects.length === 0 ? (
                                <Typography sx={{fontSize: 14, color: '#64748b'}}>
                                    Chưa có dữ liệu môn học.
                                </Typography>
                            ) : (
                                <TableContainer
                                    component={Paper}
                                    elevation={0}
                                    sx={{
                                        overflowX: 'auto',
                                        borderRadius: 2,
                                        border: '1px solid rgba(226, 232, 240, 0.95)',
                                        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
                                        bgcolor: 'rgba(255, 255, 255, 0.55)',
                                    }}
                                >
                                    <Table size="small" sx={{minWidth: 680}}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell
                                                    rowSpan={2}
                                                    align="center"
                                                    sx={{
                                                        verticalAlign: 'middle',
                                                        bgcolor: 'rgba(241, 245, 249, 0.98)',
                                                        fontWeight: 800,
                                                        fontSize: 13,
                                                        color: '#1e293b',
                                                        border: '1px solid rgba(226, 232, 240, 0.95)',
                                                        minWidth: 200,
                                                    }}
                                                >
                                                    Môn học
                                                </TableCell>
                                                <TableCell
                                                    colSpan={4}
                                                    align="center"
                                                    sx={{
                                                        bgcolor: 'rgba(241, 245, 249, 0.98)',
                                                        fontWeight: 800,
                                                        fontSize: 13,
                                                        color: '#1e293b',
                                                        border: '1px solid rgba(226, 232, 240, 0.95)',
                                                        letterSpacing: 0.5,
                                                    }}
                                                >
                                                    CẢ NĂM
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                {GRADE_LEVELS.map((g) => (
                                                    <TableCell
                                                        key={g.key}
                                                        align="center"
                                                        sx={{
                                                            bgcolor: 'rgba(248, 250, 252, 0.98)',
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                            color: '#334155',
                                                            border: '1px solid rgba(226, 232, 240, 0.95)',
                                                            minWidth: 88,
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {g.label}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {regularSubjects.map((sub) => {
                                                const idStr = String(sub.id);
                                                const row = regularGrades[idStr] || emptyGrades();
                                                return (
                                                    <TableRow key={`reg-${sub.id}`} hover>
                                                        <TableCell
                                                            sx={{
                                                                border: '1px solid rgba(241, 245, 249, 0.95)',
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                                color: '#1e293b',
                                                            }}
                                                        >
                                                            {sub.name}
                                                        </TableCell>
                                                        {GRADE_LEVELS.map((g) => (
                                                            <TableCell
                                                                key={g.key}
                                                                sx={{
                                                                    border: '1px solid rgba(241, 245, 249, 0.95)',
                                                                    p: 0.75,
                                                                    verticalAlign: 'middle',
                                                                }}
                                                            >
                                                                <TextField
                                                                    value={row[g.key]}
                                                                    onChange={(e) =>
                                                                        handleRegularGradeChange(
                                                                            sub.id,
                                                                            g.key,
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    variant="outlined"
                                                                    size="small"
                                                                    fullWidth
                                                                    placeholder="—"
                                                                    disabled={fieldsDisabled}
                                                                    inputProps={{
                                                                        inputMode: 'decimal',
                                                                        style: {textAlign: 'center'},
                                                                    }}
                                                                    sx={gradeTextFieldSx}
                                                                />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                );
                                            })}
                                            {foreignSubjects.length > 0 &&
                                                foreignRows.map((fr) => {
                                                    const rowGrades =
                                                        foreignGrades[fr.rowId] || emptyGrades();
                                                    const options = foreignOptionsForRow(
                                                        fr.rowId,
                                                        fr.subjectId,
                                                    );
                                                    return (
                                                        <TableRow key={fr.rowId} hover>
                                                            <TableCell
                                                                sx={{
                                                                    border: '1px solid rgba(241, 245, 249, 0.95)',
                                                                    p: 1,
                                                                    verticalAlign: 'top',
                                                                }}
                                                            >
                                                                <FormControl fullWidth size="small">
                                                                    <InputLabel id={`fl-${fr.rowId}`}>
                                                                        Ngôn ngữ
                                                                    </InputLabel>
                                                                    <Select
                                                                        labelId={`fl-${fr.rowId}`}
                                                                        label="Ngôn ngữ"
                                                                        value={fr.subjectId === '' ? '' : fr.subjectId}
                                                                        disabled={fieldsDisabled}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value;
                                                                            handleForeignSubjectChange(
                                                                                fr.rowId,
                                                                                v === '' ? '' : Number(v),
                                                                            );
                                                                        }}
                                                                    >
                                                                        <MenuItem value="">
                                                                            <em>Chọn ngôn ngữ</em>
                                                                        </MenuItem>
                                                                        {options.map((s) => (
                                                                            <MenuItem key={s.id} value={s.id}>
                                                                                {s.name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </TableCell>
                                                            {GRADE_LEVELS.map((g) => (
                                                                <TableCell
                                                                    key={g.key}
                                                                    sx={{
                                                                        border: '1px solid rgba(241, 245, 249, 0.95)',
                                                                        p: 0.75,
                                                                        verticalAlign: 'middle',
                                                                    }}
                                                                >
                                                                    <TextField
                                                                        value={rowGrades[g.key]}
                                                                        onChange={(e) =>
                                                                            handleForeignGradeChange(
                                                                                fr.rowId,
                                                                                g.key,
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        variant="outlined"
                                                                        size="small"
                                                                        fullWidth
                                                                        placeholder="—"
                                                                        disabled={fieldsDisabled}
                                                                        inputProps={{
                                                                            inputMode: 'decimal',
                                                                            style: {textAlign: 'center'},
                                                                        }}
                                                                        sx={gradeTextFieldSx}
                                                                    />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    );
                                                })}
                                            {foreignSubjects.length > 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={5}
                                                        sx={{
                                                            border: '1px solid rgba(241, 245, 249, 0.95)',
                                                            bgcolor: 'rgba(248, 250, 252, 0.65)',
                                                            py: 1.25,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <IconButton
                                                                color="primary"
                                                                size="small"
                                                                onClick={addForeignLanguageRow}
                                                                disabled={fieldsDisabled}
                                                                aria-label="Thêm dòng ngoại ngữ"
                                                                sx={{
                                                                    border: '1px solid rgba(37, 99, 235, 0.35)',
                                                                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                                                                }}
                                                            >
                                                                <Add fontSize="small"/>
                                                            </IconButton>
                                                            <Typography sx={{fontSize: 14, color: '#475569'}}>
                                                                Thêm ngôn ngữ (nếu học thêm ngoại ngữ thứ hai, thứ
                                                                ba…)
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                    </>
                )}
                {!loading && editMode && (
                    <Box
                        sx={{
                            mt: 3,
                            mb: 2,
                            display: 'flex',
                            justifyContent: 'flex-end',
                            pt: 1,
                            borderTop: '1px solid rgba(148, 163, 184, 0.28)',
                        }}
                    >
                        <Button
                            variant="contained"
                            onClick={() => void handleSave()}
                            disabled={saving}
                            sx={editSaveButtonSx}
                        >
                            {saving ? 'Đang lưu…' : 'Lưu'}
                        </Button>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
