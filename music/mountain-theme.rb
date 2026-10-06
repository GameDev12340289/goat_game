# Mountain theme - hopeful climb, D major pentatonic, loops seamlessly
use_bpm 90

live_loop :clock do
  cue :tick
  sleep 8
end

live_loop :pad do
  sync :tick
  with_fx :reverb, room: 0.9, mix: 0.6 do
    use_synth :blade
    [chord(:d3, :major7), chord(:b2, :minor7), chord(:g2, :major7), chord(:a2, :sus4)].each do |c|
      play c, amp: 0.35, attack: 1, sustain: 1, release: 0.8
      sleep 2
    end
  end
end

live_loop :bass do
  sync :tick
  use_synth :fm
  [:d2, :b1, :g1, :a1].each do |n|
    play n, amp: 0.5, release: 1.2, depth: 1
    sleep 1
    play n + 12, amp: 0.25, release: 0.4
    sleep 1
  end
end

live_loop :melody do
  sync :tick
  use_synth :piano
  use_random_seed 7
  notes = scale(:d4, :major_pentatonic, num_octaves: 2)
  with_fx :echo, phase: 0.75, decay: 4, mix: 0.3 do
    16.times do
      if one_in(3)
        sleep 0.5
      else
        play notes.choose, amp: 0.55, release: 0.8
        sleep 0.5
      end
    end
  end
end

live_loop :drums do
  sync :tick
  8.times do |i|
    sample :bd_tek, amp: 0.6 if i % 2 == 0
    sample :drum_cymbal_closed, amp: 0.25, rate: 1.2
    sleep 0.5
    sample :drum_snare_soft, amp: 0.35 if i % 4 == 2
    sample :drum_cymbal_closed, amp: 0.15, rate: 1.4
    sleep 0.5
  end
end
