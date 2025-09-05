import React from 'react';
import { toast, Toaster } from 'react-hot-toast';

export function notify(msg){ toast(msg, { duration:4000, position:'top-right' }); }
export default function Toasts(){ return <Toaster />; }
