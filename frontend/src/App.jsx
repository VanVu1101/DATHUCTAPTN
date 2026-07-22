import { Outlet } from 'react-router-dom';
import './App.css';
import ToastViewport from './components/ToastViewport';

function App() {
  return (
    <>
      <Outlet />
      <ToastViewport />
    </>
  );
}

export default App;
