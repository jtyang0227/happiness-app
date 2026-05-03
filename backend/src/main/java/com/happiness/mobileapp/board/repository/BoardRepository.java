package com.happiness.mobileapp.board.repository;

import com.happiness.mobileapp.board.entity.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {
    List<Board> findByTitleContainingIgnoreCase(String title);
}
