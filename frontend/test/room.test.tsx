// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RoomPage } from '../src/pages/RoomPage';
import { api } from '../src/services/api';

vi.mock('../src/services/api', () => ({ api: {
  playRoomMove: vi.fn(), resetRoom: vi.fn(), leaveRoom: vi.fn(), getRoomState: vi.fn(), leaveRoomBeacon: vi.fn(),
} }));
vi.mock('../src/services/telegram', () => ({shareTelegramLink: vi.fn(),triggerHapticImpact: vi.fn()}));
vi.mock('../src/services/sound', () => ({playTickSound: vi.fn(),playSelectSound: vi.fn()}));

const user = {id:1,first_name:'Host',coins:40000,rating:1000} as any;
const base = {id:1,room_code:'123456',host_id:1,guest_id:2,round_no:3,bet_amount:10000,
  status:'ready',host_move:null,guest_move:null,has_host_locked:false,has_guest_locked:false,
  round_deadline:new Date(Date.now()+20000).toISOString(),server_time:new Date().toISOString()} as any;
function show(room = base, onFinishRoomMatch=vi.fn()) {
  return render(<RoomPage currentUser={user} initialRoom={room} onFinishRoomMatch={onFinishRoomMatch} onBackHome={vi.fn()} onOpenTopup={vi.fn()} />);
}
afterEach(() => {cleanup();vi.useRealTimers();vi.clearAllMocks();});

describe('room lifecycle UI',()=> {
  it('sends the displayed round number with the selected move',async()=> {
    vi.mocked(api.playRoomMove).mockResolvedValue({...base,host_move:'rock',has_host_locked:true});
    show();
    fireEvent.click(screen.getByRole('button',{name:/BÚA/i}));
    await waitFor(()=>expect(api.playRoomMove).toHaveBeenCalledWith('123456','rock',3));
  });
  it('uses the authoritative move returned by the server after a late selection',async()=> {
    vi.mocked(api.playRoomMove).mockResolvedValue({
      ...base,status:'completed',host_move:'scissors',guest_move:'rock',has_host_locked:true,has_guest_locked:true,winner_id:2,
    });
    show();
    fireEvent.click(screen.getByRole('button',{name:/BAO/i}));
    await waitFor(()=>expect(screen.getByText('✌️')).toBeTruthy());
    expect(screen.queryByText('✋')).toBeNull();
  });
  it('keeps the opponent move visible after a company account has locked its move',()=> {
    show({...base,host_move:'paper',guest_move:'rock',has_host_locked:true,has_guest_locked:true,is_company_account:true});
    expect(screen.getByText(/Đối thủ đã chọn:/).textContent).toContain('BÚA');
  });
  it('lets a company account change its move during the hidden result countdown',async()=> {
    const graceRoom={...base,host_move:'rock',guest_move:'paper',has_host_locked:true,has_guest_locked:true,
      is_company_account:true,company_grace_active:true};
    vi.mocked(api.playRoomMove).mockResolvedValue({...graceRoom,host_move:'scissors'});
    show(graceRoom);
    fireEvent.click(screen.getByRole('button',{name:/KÉO/i}));
    await waitFor(()=>expect(api.playRoomMove).toHaveBeenCalledWith('123456','scissors',3));
  });
  it('opens the company result immediately when the shared countdown has already ended',async()=> {
    vi.useFakeTimers();
    const finish=vi.fn();
    const graceRoom={...base,host_move:'paper',guest_move:'rock',has_host_locked:true,has_guest_locked:true,
      is_company_account:true,company_grace_active:true};
    vi.mocked(api.getRoomState).mockResolvedValue({
      ...graceRoom,status:'completed',company_grace_active:false,round_deadline:null,winner_id:1,
    });
    show(graceRoom,finish);
    await act(async()=>{await vi.advanceTimersByTimeAsync(800);});
    expect(finish).toHaveBeenCalledTimes(1);
  });
  it('shows a pending rematch and hides move buttons until both consent',()=> {
    show({...base,status:'completed',host_rematch:true,guest_rematch:false});
    expect(screen.getByText(/Đang chờ cả hai/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:/BÚA/i})).toBeNull();
  });
  it('keeps the player in the room and displays refusal to leave an active round',async()=> {
    vi.mocked(api.leaveRoom).mockRejectedValue(new Error('Ván đang diễn ra'));
    show();
    fireEvent.click(screen.getByRole('button',{name:/RỜI PHÒNG/}));
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Ván đang diễn ra'));
    expect(screen.getByText('123456')).toBeTruthy();
  });
  it('does not let users select a move in an expired room',()=> {
    show({...base,status:'expired'});
    expect(screen.queryByRole('button',{name:/BÚA/i})).toBeNull();
    expect(screen.getByText(/Phòng đã đóng/)).toBeTruthy();
  });
});
