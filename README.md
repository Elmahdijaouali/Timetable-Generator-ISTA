# Timetable Generator ISTA

A sophisticated cross-platform desktop application for intelligent timetable generation, specifically designed for educational institutions. Built with modern web technologies and featuring advanced genetic algorithms for optimal scheduling.

## 🎯 Overview

Timetable Generator ISTA is a comprehensive solution for automated timetable creation that handles complex scheduling constraints including:
- Multi-branch educational programs
- Instructor availability and preferences
- Classroom allocation and capacity management
- Group scheduling and merging capabilities
- Remote and in-person session management

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **TailwindCSS** for modern, responsive UI
- **React Router** for navigation
- **Axios** for API communication
- **Electron** for desktop application wrapper

### Backend
- **Node.js** with Express.js framework
- **Sequelize ORM** with SQLite database
- **JWT** authentication and security
- **Multer** for file uploads
- **PDFKit** for report generation
- **ExcelJS** for data import/export

### Desktop Application
- **Electron** for cross-platform compatibility
- Automatic backend process management
- Local data storage for offline operation
- Native desktop integration

## ✨ Key Features

### 🧠 Intelligent Scheduling
- **Genetic Algorithm** optimization for conflict-free timetables
- **Constraint-based scheduling** with customizable rules
- **Automatic conflict resolution** and alternative time slot finding
- **Multi-objective optimization** balancing various constraints

### 📊 Comprehensive Management
- **Branch & Module Management**: Organize educational programs and courses
- **Instructor Management**: Handle availability, preferences, and workload
- **Classroom Management**: Track capacity, equipment, and availability
- **Group Management**: Create, merge, and manage student groups
- **Session Types**: Support for remote, in-person, and hybrid sessions

### 📈 Advanced Features
- **Historical Timetables**: Track and archive previous schedules
- **Real-time Validation**: Instant conflict detection and resolution
- **Customizable Constraints**: Configure institution-specific rules
- **Bulk Data Import**: Excel-based data import for rapid setup
- **Export Capabilities**: Generate PDF and Excel reports
- **Multi-language Support**: French interface optimized for ISTA

### 🔒 Security & Performance
- **JWT Authentication**: Secure user access control
- **Rate Limiting**: Protection against API abuse
- **Data Compression**: Optimized performance
- **Local Storage**: Complete offline functionality
- **Database Optimization**: Efficient query performance

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Elmahdijaouali/Timetable-Generator-ISTA.git
   cd Timetable-Generator-ISTA
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Start development servers**
   ```bash
   # Start frontend and backend in development mode
   npm run dev
   
   # Or start individually:
   npm run dev:frontend  # Frontend only (port 5173)
   npm run dev:backend   # Backend only (port 8002)
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8002
   - Health check: http://localhost:8002/health

## 📦 Building for Production

### Web Application
```bash
npm run build:web
npm run preview
```

### Desktop Application

#### Windows
```bash
npm run build:win
# Outputs: dist/TimetableGenerator Setup.exe
```

#### Linux
```bash
npm run build:linux
# Outputs: dist/TimetableGenerator-x.x.x.AppImage
```

#### macOS
```bash
npm run build:mac
# Outputs: dist/TimetableGenerator-x.x.x.dmg
```

#### All Platforms
```bash
npm run build:electron
```

## 🖥️ Desktop Application Usage

### Windows
1. Download `TimetableGenerator Setup.exe` from the releases
2. Run the installer and follow the setup wizard
3. Launch from Start Menu or desktop shortcut

### Linux
1. Download `TimetableGenerator-x.x.x.AppImage`
2. Make executable: `chmod +x TimetableGenerator-x.x.x.AppImage`
3. Run: `./TimetableGenerator-x.x.x.AppImage`

### macOS
1. Download `TimetableGenerator-x.x.x.dmg`
2. Open the DMG file
3. Drag the app to Applications folder
4. Launch from Launchpad or Applications folder

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode with frontend + backend |
| `npm run dev:web` | Web-only development mode |
| `npm run dev:frontend` | Frontend development only |
| `npm run dev:backend` | Backend development only |
| `npm run build` | Build for production |
| `npm run build:web` | Build web version only |
| `npm run build:electron` | Build desktop application |
| `npm run build:win` | Build Windows executable |
| `npm run build:linux` | Build Linux AppImage |
| `npm run build:mac` | Build macOS application |
| `npm run lint` | Run ESLint checks |

## 🗄️ Database

The application uses SQLite for local data storage:
- **Development**: `backend/database/database.sqlite`
- **Production**: `~/.TimetableGenerator/database.sqlite`

### Database Migration
```bash
cd backend
npm run migrate
```

### Key Tables
- `Administrators` - User accounts
- `Branches` - Educational branches/programs  
- `Modules` - Courses/subjects
- `Formateurs` - Instructors
- `Classrooms` - Physical/virtual rooms
- `Groups` - Student groups
- `Timetables` - Generated schedules
- `Sessions` - Individual class sessions

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=8002
JWT_SECRET=your-secret-key
```

### Application Settings
Access settings through the web interface at `/administrateur/parameters`:
- Academic year configuration
- Time slot definitions
- Working days
- Break periods
- Constraint weights

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/logout` - User logout

### Data Management
- `GET/POST /api/v1/branches` - Branch management
- `GET/POST /api/v1/modules` - Module management  
- `GET/POST /api/v1/formateurs` - Instructor management
- `GET/POST /api/v1/classrooms` - Classroom management
- `GET/POST /api/v1/groups` - Group management

### Timetable Generation
- `POST /api/v1/generate/timetable` - Generate new timetable
- `GET /api/v1/timetable/:id` - Get specific timetable
- `POST /api/v1/generate/personalize` - Customize timetable

### Import/Export
- `POST /api/v1/import/data` - Import Excel data
- `GET /api/v1/export/pdf/:id` - Export PDF timetable
- `GET /api/v1/export/excel/:id` - Export Excel timetable

## 🧪 Testing

```bash
cd backend
npm test
```

## 🔍 Troubleshooting

### Common Issues

**Application won't start**
- Ensure Node.js 18+ is installed
- Check all dependencies are installed: `npm install`
- Verify backend port 8002 is not in use

**Database errors**
- Clear database: Delete `backend/database/database.sqlite`
- Restart application to reinitialize
- Check file permissions

**Build failures**
- Clear build cache: `rm -rf dist/ node_modules/`
- Reinstall dependencies: `npm install`
- Check system requirements for Electron

**Performance issues**
- Check database size and optimize: `POST /api/v1/optimize`
- Monitor metrics: `GET /api/v1/metrics`
- Review logs in `~/.TimetableGenerator/backend-startup.log`

### Logs
- **Development**: Console output
- **Production**: `~/.TimetableGenerator/backend-startup.log`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature description"`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 👨‍💻 Author

**ELMAHDI JAOUALI**
- GitHub: [@Elmahdijaouali](https://github.com/Elmahdijaouali)
- Project: [Timetable Generator ISTA](https://github.com/Elmahdijaouali/Timetable-Generator-ISTA)

## 🙏 Acknowledgments

- ISTA (Institut Spécialisé de Technologie Appliquée) for the requirements and testing
- Open-source community for the amazing tools and libraries
- Contributors and testers who helped improve this application

---

For support, feature requests, or bug reports, please open an issue on the GitHub repository.
# Timetable-Generator-ISTA
# Timetable-Generator-ISTA
# Timetable-Generator-ISTA
