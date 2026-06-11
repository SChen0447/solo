import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Furnace from '@/components/Furnace';
import MaterialLibrary from '@/components/MaterialLibrary';
import ControlPanel from '@/components/ControlPanel';
import AchievementModal from '@/components/AchievementModal';
import { useAlchemy } from '@/phases/Phases';
import type { Achievement } from '@/