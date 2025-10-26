# QueueUp - Campus Queue Management System

A virtual queue management system for campus services like canteen and counseling.

## Features

- **Virtual Queuing**: Join queues for different campus services
- **Real-time Updates**: Live queue position and wait time estimates
- **Service Management**: Multiple services with different booth configurations
- **User-friendly Interface**: Modern, responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd Backend
npm install
```

3. Install frontend dependencies:
```bash
cd Frontend
npm install
```

### Running the Application

#### Option 1: Run both services together
```bash
npm start
```

#### Option 2: Run services separately

Backend (API server):
```bash
cd Backend
npm start
```

Frontend (Web interface):
```bash
cd Frontend
npm run serve
```

### Development

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/services` - List all services
- `POST /api/queue/join` - Join a queue
- `GET /api/queue/:entryId` - Get queue position
- `DELETE /api/queue/:entryId` - Leave queue
- `GET /api/queue` - Get all queue statuses

## Architecture

- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Database**: SQLite with tables for services, booths, and queue entries

## Services

The system comes with pre-configured services:
- **Campus Canteen**: 2 booths, 5-minute average service time
- **Counseling Service**: 1 booth, 15-minute average service time

## Usage

1. Open the frontend in your browser (http://localhost:5173)
2. Your user ID is automatically generated and stored locally
3. Browse available services and join queues
4. Monitor your position and estimated wait time
5. Leave queues when done

## Configuration

Environment variables (create `.env` file in Backend directory):
```
PORT=3000
CLIENT_URL=http://localhost:5173
DB_PATH=./queue.db
NODE_ENV=development
```
