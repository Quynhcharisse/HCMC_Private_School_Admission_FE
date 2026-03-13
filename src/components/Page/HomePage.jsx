import React from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Container,
    Grid,
    Typography,
    Avatar,
    Stack,
    TextField,
    Stepper,
    Step,
    StepLabel,
    Chip,
    MenuItem
} from "@mui/material";
import {
    School as SchoolIcon,
    FamilyRestroom as ParentIcon,
    Search as SearchIcon,
    Chat as ChatIcon,
    Assignment as AssignmentIcon,
    CalendarToday as CalendarIcon,
    TrendingUp as TrendingUpIcon,
    CheckCircle as CheckCircleIcon,
    ArrowForward as ArrowForwardIcon,
    LocationOn as LocationIcon,
    Star as StarIcon,
    People as PeopleIcon,
    AttachMoney as MoneyIcon,
    AccountBalance as BoardingIcon,
    Groups as GroupsIcon,
    Verified as VerifiedIcon
} from "@mui/icons-material";

function BlogCard({title, description, image, date, tags}) {
    return (
        <Card
            sx={{
                maxWidth: 360,
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                borderRadius: 3,
                boxShadow: '0 4px 18px rgba(15,23,42,0.06)',
                border: '1px solid rgba(15,23,42,0.06)',
                overflow: 'hidden',
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 10px 30px rgba(15,23,42,0.16)'
                }
            }}
        >
            <CardMedia
                component="img"
                height="180"
                image={image}
                alt={title}
            />
            <CardContent sx={{p: {xs: 2.5, md: 3}}}>
                <Typography sx={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#6b7280',
                    mb: 0.75
                }}>
                    {date}
                </Typography>
                <Typography
                    gutterBottom
                    sx={{
                        fontWeight: 700,
                        fontSize: '1.02rem',
                        color: '#111827',
                        lineHeight: 1.4
                    }}
                >
                    {title}
                </Typography>
                <Typography sx={{color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.7, mb: 1.5}}>
                    {description}
                </Typography>
                <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75}}>
                    {tags.map((tag) => (
                        <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{
                                borderRadius: 999,
                                bgcolor: '#eef2ff',
                                color: '#4338ca',
                                fontSize: '0.75rem',
                                fontWeight: 500
                            }}
                        />
                    ))}
                </Box>
            </CardContent>
            <CardActions sx={{px: {xs: 2.5, md: 3}, pb: 2.5}}>
                <Button
                    size="small"
                    sx={{
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#1976d2',
                        px: 0,
                        '&:hover': {
                            bgcolor: 'transparent',
                            textDecoration: 'underline'
                        }
                    }}
                >
                    Xem chi tiết
                </Button>
            </CardActions>
        </Card>
    );
}

function LatestAdmissionNewsSection() {
    const posts = [
        {
            title: 'Đại học Quốc gia TP.HCM mở rộng chỉ tiêu chương trình tài năng 2026',
            date: '12/03/2026',
            description: 'Thông tin chi tiết về chỉ tiêu, phương thức xét tuyển và các mốc thời gian quan trọng cho phụ huynh và học sinh.',
            image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+1',
            tags: ['Tuyển sinh', 'Đại học', 'Xét tuyển']
        },
        {
            title: 'Ngày hội tư vấn định hướng chọn trường THPT cho học sinh lớp 9',
            date: '05/03/2026',
            description: 'Sự kiện quy tụ hơn 50 trường THPT chất lượng cao tại TP.HCM với nhiều hoạt động trải nghiệm thực tế.',
            image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+2',
            tags: ['Tư vấn', 'THPT', 'Sự kiện']
        },
        {
            title: 'Chuỗi học bổng lên đến 100% học phí từ các trường THPT tư thục',
            date: '28/02/2026',
            description: 'Tổng hợp các chương trình học bổng mới nhất dành cho học sinh có thành tích học tập và hoạt động nổi bật.',
            image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+3',
            tags: ['Học bổng', 'THPT', 'Tài chính']
        },
        {
            title: 'Cập nhật lịch thi tuyển sinh lớp 10 công lập tại TP.HCM năm 2026',
            date: '20/02/2026',
            description: 'Lịch thi, môn thi và thời gian đăng ký dự thi tuyển sinh lớp 10 các trường công lập tại TP.HCM.',
            image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+4',
            tags: ['Tuyển sinh', 'Lớp 10', 'THPT']
        },
        {
            title: 'Thông báo xét tuyển học bạ các trường cao đẳng sư phạm khu vực phía Nam',
            date: '15/02/2026',
            description: 'Danh sách trường, mức điểm nhận hồ sơ và hình thức xét tuyển học bạ dành cho thí sinh quan tâm ngành sư phạm.',
            image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+5',
            tags: ['Cao đẳng', 'Học bạ', 'Sư phạm']
        },
        {
            title: 'Chương trình dự bị đại học liên kết quốc tế',
            date: '08/02/2026',
            description: 'Giới thiệu chương trình dự bị đại học liên kết với các trường quốc tế, phù hợp cho học sinh có định hướng du học.',
            image: 'https://via.placeholder.com/600x350?text=Tin+tuyen+sinh+6',
            tags: ['Tuyển sinh', 'Du học', 'Liên kết quốc tế']
        }
    ];

    return (
        <Box sx={{py: {xs: 10, md: 12}, bgcolor: '#DBEAFE'}}>
            <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}}}>
                <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 800,
                            mb: 2,
                            color: '#111827',
                            fontSize: {xs: '2rem', md: '2.5rem'},
                            letterSpacing: '-0.02em'
                        }}
                    >
                        Tin Tuyển Sinh Mới Nhất
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: '#4b5563',
                            fontSize: {xs: '0.95rem', md: '1.05rem'},
                            maxWidth: '640px',
                            mx: 'auto',
                            lineHeight: 1.7
                        }}
                    >
                        Cập nhật những thông tin tuyển sinh mới nhất từ các trường đại học, cao đẳng và chương trình đào tạo.
                    </Typography>
                </Box>
                <Grid container spacing={3}>
                    {posts.map((post, index) => (
                        <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            key={index}
                            sx={{display: 'flex', justifyContent: 'center'}}
                        >
                            <BlogCard
                                title={post.title}
                                description={post.description}
                                image={post.image}
                                date={post.date}
                                tags={post.tags}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
}

const HCM_DISTRICTS = [
    'Khu vực TPHCM',
    'Quận 1',
    'Quận 3',
    'Quận 4',
    'Quận 5',
    'Quận 6',
    'Quận 7',
    'Quận 8',
    'Quận 10',
    'Quận 11',
    'Quận 12',
    'Quận Bình Thạnh',
    'Quận Tân Bình',
    'Quận Tân Phú',
    'Quận Phú Nhuận',
    'Quận Gò Vấp',
    'Quận Bình Tân',
    'Thành phố Thủ Đức',
    'Huyện Bình Chánh',
    'Huyện Cần Giờ',
    'Huyện Củ Chi',
    'Huyện Hóc Môn',
    'Huyện Nhà Bè'
];

export default function HomePage() {
    const [searchKeyword, setSearchKeyword] = React.useState('');
    const [selectedDistrict, setSelectedDistrict] = React.useState(HCM_DISTRICTS[0]);

    const handleRegisterClick = () => {
        window.location.href = '/register';
    };

    return (
        <Box sx={{bgcolor: '#ffffff', overflow: 'hidden'}}>
            {/* 2️⃣ Hero banner */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #64b5f6 100%)',
                    color: 'white',
                    pt: {xs: 10, md: 14},
                    pb: {xs: 8, md: 12},
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                        pointerEvents: 'none'
                    }
                }}
            >
                <Container maxWidth="lg" sx={{position: 'relative', zIndex: 1}}>
                    <Box sx={{textAlign: 'center', maxWidth: '900px', mx: 'auto', px: {xs: 2, md: 0}}}>
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 3,
                                px: 2.5,
                                py: 1,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.15)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <StarIcon sx={{fontSize: 20, color: '#ffd700'}}/>
                            <Typography sx={{fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em'}}>
                                NỀN TẢNG TƯ VẤN TUYỂN SINH HÀNG ĐẦU
                            </Typography>
                        </Box>
                        <Typography
                            variant="h1"
                            sx={{
                                fontWeight: 800,
                                mb: 3.5,
                                fontSize: {xs: '2.4rem', md: '3.6rem'},
                                lineHeight: 1.15,
                                letterSpacing: '-0.03em',
                                background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.92) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            Kết Nối Phụ Huynh Và Trường Học
                        </Typography>
                        <Typography
                            variant="h5"
                            sx={{
                                mt: 0.5,
                                mb: 5,
                                fontWeight: 400,
                                opacity: 0.96,
                                fontSize: {xs: '1.125rem', md: '1.5rem'},
                                lineHeight: 1.7,
                                maxWidth: '800px',
                                mx: 'auto'
                            }}
                        >
                            Nền tảng giúp phụ huynh tìm trường phù hợp, so sánh khách quan và kết nối nhanh chóng với các trường THCS, THPT tại TP.HCM.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleRegisterClick}
                            sx={{
                                bgcolor: 'white',
                                color: '#1976d2',
                                px: {xs: 6, md: 8},
                                py: 2,
                                fontSize: {xs: '1rem', md: '1.25rem'},
                                fontWeight: 700,
                                borderRadius: 3,
                                textTransform: 'none',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                minWidth: {xs: '100%', sm: '280px'},
                                mb: 3,
                                '&:hover': {
                                    bgcolor: '#f5f5f5',
                                    boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                                    transform: 'translateY(-3px) scale(1.02)'
                                }
                            }}
                        >
                            Đăng ký ngay
                        </Button>

                        <Box
                            sx={{
                                mt: 2,
                                display: 'flex',
                                flexDirection: {xs: 'column', md: 'row'},
                                alignItems: {xs: 'stretch', md: 'center'},
                                gap: 2,
                                bgcolor: 'rgba(255,255,255,0.12)',
                                borderRadius: 3,
                                p: {xs: 2, md: 2.5},
                                border: '1px solid rgba(255,255,255,0.35)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <TextField
                                placeholder="Tìm kiếm trường học..."
                                size="small"
                                fullWidth
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                sx={{
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': {
                                            borderColor: 'rgba(25,118,210,0.2)',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'rgba(25,118,210,0.4)',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#1976d2',
                                            borderWidth: 2,
                                        },
                                    },
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'relative',
                                    minWidth: {xs: '100%', md: 260}
                                }}
                            >
                                <LocationIcon
                                    sx={{
                                        position: 'absolute',
                                        left: 14,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#1976d2',
                                        fontSize: 22,
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }}
                                />
                                <TextField
                                    select
                                    size="small"
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    sx={{
                                        bgcolor: 'white',
                                        borderRadius: 999,
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 999,
                                            transition: 'all 0.25s ease',
                                            '& fieldset': {
                                                borderColor: 'rgba(25,118,210,0.25)'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'rgba(25,118,210,0.6)'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#ffffff',
                                                borderWidth: 2
                                            }
                                        },
                                        '& .MuiSelect-select': {
                                            pl: 4.5,
                                            py: 1.1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontWeight: 600,
                                            color: '#111827'
                                        }
                                    }}
                                    SelectProps={{
                                        MenuProps: {
                                            PaperProps: {
                                                elevation: 6,
                                                sx: {
                                                    borderRadius: 2,
                                                    mt: 1,
                                                    overflow: 'hidden'
                                                }
                                            }
                                        }
                                    }}
                                >
                                    {HCM_DISTRICTS.map((district) => (
                                        <MenuItem key={district} value={district}>
                                            {district}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>
                            <Button
                                variant="contained"
                                sx={{
                                    bgcolor: 'white',
                                    color: '#1976d2',
                                    minWidth: 48,
                                    height: 40,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    '&:hover': {
                                        bgcolor: '#e3f2fd'
                                    }
                                }}
                            >
                                <SearchIcon/>
                            </Button>
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* 4️⃣ Trường nổi bật */}
            <Box sx={{
                py: {xs: 8, md: 10},
                bgcolor: '#E6F0FF',
                position: 'relative'
            }}>
                <Container maxWidth="xl" sx={{px: {xs: 2, sm: 3, md: 4}}}>
                    <Box sx={{mb: {xs: 4, md: 6}, textAlign: 'center'}}>
                        <Box sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            mb: 1.5,
                            px: 2,
                            py: 0.75,
                            borderRadius: 2,
                            bgcolor: 'rgba(25,118,210,0.08)',
                            border: '1px solid rgba(25,118,210,0.15)'
                        }}>
                            <StarIcon sx={{fontSize: 18, color: '#ffb300'}}/>
                            <Typography sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                color: '#1976d2',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}>
                                Nổi bật
                            </Typography>
                        </Box>
                        <Typography
                            variant="h2"
                            sx={{
                                fontWeight: 700,
                                mb: 1,
                                color: '#1a237e',
                                fontSize: {xs: '1.75rem', sm: '2.25rem', md: '2.5rem'},
                                letterSpacing: '-0.01em',
                                lineHeight: 1.2
                            }}
                        >
                            Top 5 Trường Học Nổi Bật
                        </Typography>
                        <Typography variant="body1" sx={{
                            color: '#666', 
                            fontSize: {xs: '0.9375rem', md: '1rem'}, 
                            maxWidth: '600px',
                                mx: 'auto',
                            lineHeight: 1.6
                        }}>
                            Các trường học uy tín hàng đầu đã tin tưởng và hợp tác với chúng tôi
                        </Typography>
                    </Box>

                    <Grid container spacing={{xs: 2.5, sm: 3, md: 3.5}} justifyContent="center">
                        {[
                            {name: 'Trường THPT Chuyên Lê Hồng Phong', location: 'Quận 5, TP.HCM', logo: 'LHP', rating: 4.9, reviews: 12, tuition: 'Miễn phí', grade: 'A+', featured: true, boarding: true},
                            {name: 'Trường THPT Nguyễn Thị Minh Khai', location: 'Quận 3, TP.HCM', logo: 'NTMK', rating: 4.8, reviews: 8, tuition: 'Miễn phí', grade: 'A', featured: true, boarding: true},
                            {name: 'Trường THPT Trần Đại Nghĩa', location: 'Quận 1, TP.HCM', logo: 'TDN', rating: 4.9, reviews: 15, tuition: 'Miễn phí', grade: 'A+', featured: true, boarding: true},
                            {name: 'Trường THPT Gia Định', location: 'Quận Bình Thạnh, TP.HCM', logo: 'GD', rating: 4.7, reviews: 10, tuition: 'Miễn phí', grade: 'A', featured: false, boarding: true},
                            {name: 'Trường THPT Nguyễn Du', location: 'Quận 10, TP.HCM', logo: 'ND', rating: 4.8, reviews: 9, tuition: 'Miễn phí', grade: 'A', featured: false, boarding: true}
                        ].map((school, index) => (
                            <Grid 
                                item 
                                xs={12} 
                                sm={6} 
                                md={4} 
                                lg={2.4}
                                key={index}
                            sx={{
                                    '@media (min-width: 1200px)': {
                                        maxWidth: '20%',
                                        flexBasis: '20%'
                                    }
                                }}
                            >
                            <Card
                                sx={{
                                    height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                        bgcolor: 'white',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        cursor: 'pointer',
                                    '&:hover': {
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                            transform: 'translateY(-6px)',
                                            '& .school-image': {
                                                transform: 'scale(1.05)'
                                                }
                                            }
                                        }}
                                    >
                                    {/* Image Section */}
                                    <Box sx={{
                                        position: 'relative',
                                        width: '100%',
                                        height: {xs: 180, sm: 200, md: 220},
                                        bgcolor: '#e3f2fd',
                                                background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Badge Nổi bật */}
                                        {school.featured && (
                                            <Box sx={{
                                                        position: 'absolute',
                                                top: 12,
                                                left: 12,
                                                zIndex: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: '#17a2b8',
                                                border: '1px solid #17a2b8'
                                            }}>
                                                <StarIcon sx={{fontSize: 14, color: 'white'}}/>
                                                <Typography sx={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: 'white'
                                                }}>
                                                    Nổi bật
                                        </Typography>
                                    </Box>
                                        )}
                                        
                                        {/* Badge Trường tư */}
                                        {school.boarding && (
                                            <Box sx={{
                                            position: 'absolute',
                                                top: school.featured ? 48 : 12,
                                                left: 12,
                                                zIndex: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                                gap: 0.5,
                                                px: 1.5,
                                                py: 0.5,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(255,255,255,0.9)',
                                                border: '1px solid rgba(0,0,0,0.1)'
                                            }}>
                                                <BoardingIcon sx={{fontSize: 14, color: '#666'}}/>
                                                <Typography sx={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    color: '#333'
                                                }}>
                                                    Trường tư
                                            </Typography>
                                    </Box>
                                        )}
                                        
                                        {/* School Logo/Avatar */}
                                        <Avatar
                                            className="school-image"
                                sx={{
                                                width: 100,
                                                height: 100,
                                                bgcolor: '#1976d2',
                                                fontSize: '2rem',
                                                fontWeight: 700,
                                                boxShadow: '0 4px 16px rgba(25,118,210,0.3)',
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                                transition: 'transform 0.3s ease'
                                            }}
                                        >
                                            {school.logo}
                                        </Avatar>
                                    </Box>
                                    
                                    {/* Content Section */}
                                    <CardContent sx={{
                                        flexGrow: 1,
                                                display: 'flex',
                                        flexDirection: 'column',
                                        p: 2.5
                                    }}>
                                        {/* School Name */}
                                        <Box sx={{display: 'flex', alignItems: 'flex-start', mb: 1.5, gap: 1}}>
                                            <Typography 
                                                variant="h6" 
                                                sx={{
                                                    fontWeight: 600, 
                                                    color: '#1a237e', 
                                                    fontSize: {xs: '1rem', sm: '1.0625rem'}, 
                                                    lineHeight: 1.3,
                                                    flex: 1
                                                }}
                                            >
                                            {school.name}
                                        </Typography>
                                        </Box>
                                        
                                        {/* Tuition */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            mb: 1.5
                                        }}>
                                            <MoneyIcon sx={{fontSize: 18, color: '#666'}}/>
                                            <Typography sx={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#333'
                                            }}>
                                                {school.tuition}
                                        </Typography>
                                    </Box>
                                        
                                        {/* Location */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            mb: 1.5
                                        }}>
                                            <LocationIcon sx={{fontSize: 18, color: '#666'}}/>
                                            <Typography sx={{
                                                fontSize: '0.875rem',
                                                color: '#666'
                                            }}>
                                                {school.location}
                                            </Typography>
                                    </Box>
                                        
                                        {/* Rating & Grade */}
                                        <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                            gap: 1.5,
                                            pt: 1.5,
                                            borderTop: '1px solid rgba(0,0,0,0.08)',
                                            mt: 'auto'
                                        }}>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75
                                            }}>
                                                <Box sx={{
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 1,
                                                    bgcolor: '#dc3545',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: 'white'
                                                    }}>
                                                        {school.grade}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.25}}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <StarIcon 
                                                            key={i}
                                            sx={{
                                                                fontSize: 14,
                                                                color: i < Math.floor(school.rating) ? '#ffb300' : '#ddd'
                                                            }}
                                                        />
                                                    ))}
                                        </Box>
                                                <Typography sx={{
                                                    fontSize: '0.8125rem',
                                                    color: '#666',
                                                    ml: 0.5
                                                }}>
                                                    {school.rating} ({school.reviews} Bình luận)
                                        </Typography>
                                    </Box>
                                        </Box>
                                        
                                        {/* Arrow Icon */}
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            mt: 1
                                        }}>
                                            <ArrowForwardIcon sx={{
                                                fontSize: 20,
                                                color: '#1976d2'
                                            }}/>
                                        </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* 6️⃣ Quy trình tư vấn */}
            <Box sx={{py: {xs: 10, md: 12}, bgcolor: '#FFFFFF'}}>
                <Container maxWidth="md" sx={{px: {xs: 3, md: 4}}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                        <Typography 
                            variant="h2"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                color: '#1a237e',
                                fontSize: {xs: '2.1rem', md: '2.6rem'},
                                letterSpacing: '-0.02em'
                            }}
                        >
                            Quy Trình Tư Vấn
                        </Typography>
                        <Typography variant="body1" sx={{
                            color: '#666',
                            fontSize: {xs: '0.95rem', md: '1.05rem'},
                            maxWidth: '640px',
                            mx: 'auto',
                            lineHeight: 1.7
                        }}>
                            Từ bước tìm hiểu ban đầu đến khi chốt trường, mọi thứ đều được hệ thống hóa rõ ràng
                        </Typography>
                    </Box>
                    <Box sx={{maxWidth: 700, mx: 'auto'}}>
                        {[
                            {icon: <SearchIcon/>, title: 'Khảo sát nhu cầu', desc: 'Phụ huynh nhập thông tin, khu vực, ngân sách và mong muốn cho con.'},
                            {icon: <SchoolIcon/>, title: 'Đề xuất trường phù hợp', desc: 'Hệ thống gợi ý danh sách trường phù hợp, kèm so sánh chi tiết.'},
                            {icon: <ChatIcon/>, title: 'Kết nối tư vấn', desc: 'Gửi yêu cầu tới trường, chat trực tiếp với bộ phận tuyển sinh.'},
                            {icon: <CalendarIcon/>, title: 'Tham quan & hoàn tất', desc: 'Đặt lịch tham quan, phỏng vấn và hoàn tất thủ tục nhập học.'}
                        ].map((step, index, arr) => (
                            <Box
                                key={index}
                                        sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    mb: index === arr.length - 1 ? 0 : 3
                                }}
                            >
                                <Box sx={{position: 'relative', mr: 2}}>
                                            <Box
                                                sx={{
                                            width: 36,
                                            height: 36,
                                                    borderRadius: '50%',
                                            bgcolor: '#1976d2',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                            color: 'white',
                                            boxShadow: '0 4px 10px rgba(25,118,210,0.3)'
                                        }}
                                    >
                                        {index + 1}
                                    </Box>
                                    {index !== arr.length - 1 && (
                                        <Box
                                            sx={{
                                                        position: 'absolute',
                                                top: 36,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: 2,
                                                height: 48,
                                                bgcolor: '#e5e7eb'
                                            }}
                                        />
                                    )}
                                </Box>
                                <Card
                                    sx={{
                                        flex: 1,
                                        mb: 0,
                                        borderRadius: 2,
                                        boxShadow: '0 4px 18px rgba(15,23,42,0.06)',
                                        border: '1px solid rgba(15,23,42,0.06)'
                                    }}
                                >
                                    <CardContent sx={{p: {xs: 2.5, md: 3}}}>
                                        <Box sx={{display: 'flex', alignItems: 'center', mb: 1.5, gap: 1}}>
                                            <Box sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                bgcolor: '#e3f2fd',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#1976d2'
                                            }}>
                                                    {step.icon}
                                                </Box>
                                            <Typography sx={{fontWeight: 700, fontSize: '1rem', color: '#111827'}}>
                                                {step.title}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.7}}>
                                                {step.desc}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                            </Box>
                            ))}
                    </Box>
                </Container>
            </Box>

            {/* 7️⃣ Tin tuyển sinh */}
            <LatestAdmissionNewsSection/>

            {/* 8️⃣ Form đăng ký tư vấn */}
            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#2563EB'}}>
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}, color: '#FFFFFF'}}>
                    <>
                        <Box sx={{textAlign: 'center', mb: {xs: 6, md: 8}}}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontWeight: 800,
                                    mb: 2,
                                    fontSize: {xs: '1.9rem', md: '2.5rem'},
                                    letterSpacing: '-0.02em',
                                    color: '#FFFFFF'
                                }}
                            >
                                Đăng Ký Nhận Tư Vấn Miễn Phí
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    mb: 3,
                                    fontSize: {xs: '0.95rem', md: '1.05rem'},
                                    lineHeight: 1.7,
                                    color: 'rgba(255,255,255,0.9)',
                                    maxWidth: '640px',
                                    mx: 'auto'
                                }}
                            >
                                Để lại thông tin, đội ngũ tư vấn của EduBridgeHCM sẽ liên hệ trong vòng
                                24 giờ để hỗ trợ bạn chọn trường, chọn ngành phù hợp với nhu cầu và tài chính.
                            </Typography>
                            <Stack spacing={1.5} sx={{color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', alignItems: 'center'}}>
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                    <CheckCircleIcon sx={{fontSize: 18, color: '#22c55e'}}/>
                                    <Typography>Hoàn toàn miễn phí, bảo mật thông tin.</Typography>
                                </Box>
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                    <CheckCircleIcon sx={{fontSize: 18, color: '#22c55e'}}/>
                                    <Typography>Tư vấn 1-1 theo hồ sơ và nhu cầu của từng gia đình.</Typography>
                                </Box>
                            </Stack>
                        </Box>
                        <Box sx={{display: 'flex', justifyContent: 'center'}}>
                            <Card
                                sx={{
                                    borderRadius: 3,
                                    boxShadow: '0 12px 40px rgba(15,23,42,0.15)',
                                    p: {xs: 3, md: 4},
                                    bgcolor: 'white',
                                    border: '1px solid rgba(15,23,42,0.06)',
                                    maxWidth: '700px',
                                    width: '100%'
                                }}
                            >
                                <Stack spacing={2.5}>
                                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                                        <TextField
                                            label="Họ và tên phụ huynh"
                                            fullWidth
                                            size="small"
                                        />
                                        <TextField
                                            label="Họ tên học sinh"
                                            fullWidth
                                            size="small"
                                        />
                                    </Stack>
                                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
                                        <TextField
                                            label="Email liên hệ"
                                            fullWidth
                                            size="small"
                                            type="email"
                                        />
                                        <TextField
                                            label="Số điện thoại"
                                            fullWidth
                                            size="small"
                                        />
                                    </Stack>
                                    <TextField
                                        label="Khu vực / Quận quan tâm"
                                        fullWidth
                                        size="small"
                                    />
                                    <TextField
                                        label="Nhu cầu tư vấn (ví dụ: chọn trường THCS/THPT, học bổng, chuyển trường...)"
                                        fullWidth
                                        size="small"
                                        multiline
                                        rows={4}
                                    />
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={handleRegisterClick}
                                        sx={{
                                            mt: 1,
                                            bgcolor: '#1976d2',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            py: 1.4,
                                            borderRadius: 2,
                                            boxShadow: '0 8px 20px rgba(25,118,210,0.35)',
                                            '&:hover': {
                                                bgcolor: '#1565c0',
                                                boxShadow: '0 10px 28px rgba(25,118,210,0.45)',
                                            }
                                        }}
                                    >
                                        Gửi yêu cầu tư vấn
                                    </Button>
                                </Stack>
                            </Card>
                        </Box>
                    </>
                </Container>
            </Box>

            {/* 3️⃣ Thống kê hệ thống (section cuối) */}
            <Box sx={{py: {xs: 10, md: 14}, bgcolor: '#EFF6FF', position: 'relative', overflow: 'hidden'}}>
                <Container maxWidth="lg" sx={{px: {xs: 3, md: 4}, position: 'relative', zIndex: 1}}>
                    <Box sx={{textAlign: 'center', mb: {xs: 8, md: 10}}}>
                        <Typography variant="body1" sx={{
                            color: '#64748B',
                            fontSize: {xs: '1rem', md: '1.125rem'},
                            maxWidth: '800px',
                            mx: 'auto',
                            lineHeight: 1.7,
                            mb: {xs: 6, md: 8}
                        }}>
                            Những con số thể hiện niềm tin của phụ huynh và trường học dành cho EduBridgeHCM
                        </Typography>
                    </Box>
                    <Grid container spacing={{xs: 4, sm: 5, md: 6}} justifyContent="center">
                        {[
                            {number: '150+', label: 'Trường học tham gia'},
                            {number: '5,000+', label: 'Phụ huynh đăng ký'},
                            {number: '10,000+', label: 'Yêu cầu tư vấn'},
                            {number: '95%', label: 'Độ hài lòng'}
                        ].map((stat, index) => (
                            <Grid
                                item
                                xs={12}
                                sm={6}
                                md={3}
                                key={index}
                                sx={{display: 'flex', justifyContent: 'center'}}
                            >
                                <Box sx={{textAlign: 'center'}}>
                                    <Typography
                                        sx={{
                                            fontSize: {xs: '3rem', sm: '3.5rem', md: '4rem'},
                                            fontWeight: 800,
                                            background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            lineHeight: 1.1,
                                            mb: 1.5
                                        }}
                                    >
                                        {stat.number}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: {xs: '0.875rem', md: '1rem'},
                                            color: '#64748B',
                                            lineHeight: 1.5,
                                            fontWeight: 500
                                        }}
                                    >
                                        {stat.label}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}
