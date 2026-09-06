import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {ProjectSummary} from '../shared/contracts';
import {GameArtwork} from './GameLibrary';
vi.mock('./preferences',()=>({usePreferences:()=>({t:(key:string)=>key})}));

describe('游戏封面维度标识',()=>{
  it('3D 封面与加载失败状态都保留角标，2D 不贴标签',()=>{
    const game={title:'测试游戏',template:'generated',dimensions:'3d'} as ProjectSummary;
    const {rerender}=render(<GameArtwork game={game} featured={false}/>);
    expect(screen.getByText('3D')).toHaveClass('library-dimension-badge');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.getByText('3D')).toBeVisible();
    rerender(<GameArtwork game={{...game,dimensions:'2d'}} featured={false}/>);
    expect(screen.queryByText('3D')).not.toBeInTheDocument();
  });
});
