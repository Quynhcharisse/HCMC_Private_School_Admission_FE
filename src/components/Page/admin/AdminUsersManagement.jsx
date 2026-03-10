import React from "react";
import {
    Box,
    Card,
    CardContent,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import PeopleIcon from '@mui/icons-material/People';

export default function AdminUsersManagement() {
    // Placeholder data - sẽ được thay thế bằng API call sau
    const users = [];

    return (
        <Box>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 2, mb: 3}}>
                <PeopleIcon sx={{fontSize: 32, color: '#1d4ed8'}}/>
                <Typography variant="h4" sx={{fontWeight: 700, color: '#1e293b'}}>
                    Quản Lý Người Dùng
                </Typography>
            </Box>

            <Card
                elevation={2}
                sx={{
                    borderRadius: 3,
                    border: '1px solid #e0e7ff',
                }}
            >
                <CardContent>
                    <TableContainer component={Paper} elevation={0}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{bgcolor: '#f8fafc'}}>
                                    <TableCell sx={{fontWeight: 700, color: '#1e293b'}}>STT</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: '#1e293b'}}>Email</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: '#1e293b'}}>Tên</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: '#1e293b'}}>Vai Trò</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: '#1e293b'}}>Trạng Thái</TableCell>
                                    <TableCell sx={{fontWeight: 700, color: '#1e293b'}}>Thao Tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{py: 4}}>
                                            <Typography variant="body1" sx={{color: '#64748b'}}>
                                                Chưa có dữ liệu người dùng
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user, index) => (
                                        <TableRow key={user.id} hover>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: user.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {user.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
